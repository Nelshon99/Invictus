import prisma from '../utils/database';
import { 
  calculateGoldWeight, 
  isWithinTolerance, 
  calculateDifference,
  isValidWeight,
  centigramsToGrams,
  WEIGHING_TOLERANCE_CG 
} from '../utils/helpers';
import { deleteCache } from '../utils/redis';

export interface CreateWeighingData {
  trayId: string;
  type: 'OPENING' | 'CLOSING';
  totalWeightCg: number;
  trayWeightCg: number;
  pieceCount: number;
  operator: string;
  notes?: string;
}

// Estado del ciclo de pesaje para una bandeja
type TrayDayState = 'NEEDS_OPENING' | 'OPENED_NEEDS_CLOSING' | 'CLOSED';

export class WeighingService {

  // Determinar el estado actual de una bandeja para hoy
  async getTrayDayState(trayId: string): Promise<TrayDayState> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOpenings = await prisma.weighing.count({
      where: {
        trayId,
        type: 'OPENING',
        createdAt: { gte: startOfDay },
      },
    });

    const todayClosings = await prisma.weighing.count({
      where: {
        trayId,
        type: 'CLOSING',
        createdAt: { gte: startOfDay },
      },
    });

    if (todayOpenings === 0) return 'NEEDS_OPENING';
    if (todayClosings === 0) return 'OPENED_NEEDS_CLOSING';
    return 'CLOSED';
  }

  // Obtener el último pesaje de una bandeja (cualquier tipo)
  // Se mantiene para referencia histórica, pero ya no se usa en la validación de pesajes
  async getLastWeighing(trayId: string) {
    return await prisma.weighing.findFirst({
      where: { trayId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Obtener los datos actuales de la bandeja desde la base de datos
  // Estos datos ya reflejan todas las operaciones: ventas, traslados, adición de piezas
  async getCurrentTrayData(trayId: string) {
    return await prisma.tray.findUnique({
      where: { id: trayId },
      select: {
        goldWeightCg: true,
        trayWeightCg: true,
        pieceCount: true,
      },
    });
  }

  // Validación completa antes de crear un pesaje
  async validateWeighing(data: CreateWeighingData): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    info?: {
      trayDayState: TrayDayState;
      currentTotalWeightCg?: number;
      currentGoldWeightCg?: number;
      currentTrayWeightCg?: number;
      currentPieceCount?: number;
      previousTotalWeightCg?: number;
      differenceCg?: number;
      withinTolerance?: boolean;
    };
  }> {
    const { trayId, type, totalWeightCg, trayWeightCg, pieceCount } = data;
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: any = {};

    // Validaciones básicas de peso
    if (!isValidWeight(totalWeightCg)) {
      errors.push('El peso total no puede ser negativo');
    }

    if (!isValidWeight(trayWeightCg)) {
      errors.push('El peso de la bandeja no puede ser negativo');
    }

    const goldWeightCg = calculateGoldWeight(totalWeightCg, trayWeightCg);
    if (totalWeightCg > 0 && trayWeightCg > 0 && !isValidWeight(goldWeightCg)) {
      errors.push('El peso del oro no puede ser negativo (peso total < peso bandeja)');
    }

    if (pieceCount < 0) {
      errors.push('La cantidad de piezas no puede ser negativa');
    }

    // Validar que la bandeja existe
    const tray = await prisma.tray.findUnique({ where: { id: trayId } });
    if (!tray) {
      errors.push('Bandeja no encontrada');
      return { valid: false, errors, warnings, info };
    }

    // Obtener estado del día
    const trayDayState = await this.getTrayDayState(trayId);
    info.trayDayState = trayDayState;

    // Validar orden secuencial: Apertura → Cierre → Apertura (día siguiente)
    if (type === 'OPENING') {
      if (trayDayState === 'OPENED_NEEDS_CLOSING') {
        errors.push('No se puede hacer apertura: primero debe cerrar el pesaje de hoy');
      }
      if (trayDayState === 'CLOSED') {
        // Verificar si el cierre fue hoy o en otro día
        const lastClosing = await prisma.weighing.findFirst({
          where: { trayId, type: 'CLOSING' },
          orderBy: { createdAt: 'desc' },
        });
        if (lastClosing) {
          const closingDate = new Date(lastClosing.createdAt);
          const today = new Date();
          closingDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          if (closingDate.getTime() === today.getTime()) {
            errors.push('El ciclo de hoy ya está completo (apertura + cierre). Vuelva mañana para una nueva apertura');
          }
          // Si el cierre fue de otro día, se permite la apertura
        }
      }
    } else if (type === 'CLOSING') {
      if (trayDayState === 'NEEDS_OPENING') {
        errors.push('No se puede hacer cierre sin pesaje de apertura del día');
      }
      if (trayDayState === 'CLOSED') {
        errors.push('El cierre de hoy ya ha sido registrado. Vuelva mañana para una nueva apertura');
      }
    }

    // Para ambos tipos (OPENING y CLOSING), comparar el peso total medido en balanza
    // con el peso total esperado de la bandeja (oro + bandeja vacía) desde la BD.
    // tray.goldWeightCg + tray.trayWeightCg refleja el peso total real esperado.
    if (totalWeightCg > 0) {
      const currentTray = await this.getCurrentTrayData(trayId);
      if (currentTray && currentTray.goldWeightCg > 0) {
        const currentTotalWeightCg = currentTray.goldWeightCg + currentTray.trayWeightCg;
        info.currentTotalWeightCg = currentTotalWeightCg;
        info.currentGoldWeightCg = currentTray.goldWeightCg;
        info.currentTrayWeightCg = currentTray.trayWeightCg;
        info.currentPieceCount = currentTray.pieceCount;
        info.previousTotalWeightCg = currentTotalWeightCg;

        const diffCg = calculateDifference(totalWeightCg, currentTotalWeightCg);
        info.differenceCg = diffCg;
        info.withinTolerance = isWithinTolerance(totalWeightCg, currentTotalWeightCg);

        if (!info.withinTolerance) {
          const diffGrams = centigramsToGrams(Math.abs(diffCg)).toFixed(2);
          const toleranceGrams = centigramsToGrams(WEIGHING_TOLERANCE_CG).toFixed(2);
          const measuredGrams = centigramsToGrams(totalWeightCg).toFixed(2);
          const expectedGrams = centigramsToGrams(currentTotalWeightCg).toFixed(2);
          const goldGrams = centigramsToGrams(currentTray.goldWeightCg).toFixed(2);
          const trayGrams = centigramsToGrams(currentTray.trayWeightCg).toFixed(2);
          warnings.push(
            `Peso total en balanza (${measuredGrams}g) no coincide con el peso total registrado en bandeja ` +
            `(${expectedGrams}g = ${goldGrams}g oro + ${trayGrams}g bandeja vacía). ` +
            `Diferencia: ${diffGrams}g, excede el margen de ±${toleranceGrams}g`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  async createWeighing(data: CreateWeighingData): Promise<any> {
    const { trayId, type, totalWeightCg, trayWeightCg, pieceCount, operator, notes } = data;

    // Validación completa antes de proceder
    const validation = await this.validateWeighing(data);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const goldWeightCg = calculateGoldWeight(totalWeightCg, trayWeightCg);

    return await prisma.$transaction(async (tx: any) => {
      // Validar que la bandeja existe
      const tray = await tx.tray.findUnique({ where: { id: trayId } });
      if (!tray) {
        throw new Error('Bandeja no encontrada');
      }

      // Validar orden secuencial dentro de la transacción (double-check)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayOpeningCount = await tx.weighing.count({
        where: {
          trayId,
          type: 'OPENING',
          createdAt: { gte: startOfDay },
        },
      });
      const todayClosingCount = await tx.weighing.count({
        where: {
          trayId,
          type: 'CLOSING',
          createdAt: { gte: startOfDay },
        },
      });

      if (type === 'CLOSING') {
        if (todayOpeningCount === 0) {
          throw new Error('No se puede hacer pesaje de cierre sin pesaje de apertura del día');
        }
        if (todayClosingCount > 0) {
          throw new Error('El cierre de hoy ya ha sido registrado para esta bandeja');
        }
      }

      if (type === 'OPENING') {
        // Si ya hay apertura hoy y no hay cierre, bloquear
        if (todayOpeningCount > 0 && todayClosingCount === 0) {
          throw new Error('Ya existe una apertura de hoy sin cierre. Complete el cierre primero');
        }
        // Si ya hay apertura Y cierre hoy, bloquear (no se permite segunda apertura del mismo día)
        if (todayOpeningCount > 0 && todayClosingCount > 0) {
          throw new Error('El ciclo de hoy ya está completo (apertura + cierre). Vuelva mañana para una nueva apertura');
        }
      }

      // Obtener el peso total actual de la bandeja como referencia para comparación.
      // tray.goldWeightCg + tray.trayWeightCg refleja el peso total después de todas las operaciones.
      const currentTotalWeightCg = tray.goldWeightCg + tray.trayWeightCg;

      let previousTotalWeightCg = 0;
      let diffCg = 0;
      let withinTol = true;

      if (currentTotalWeightCg > 0) {
        previousTotalWeightCg = currentTotalWeightCg;
        diffCg = calculateDifference(totalWeightCg, currentTotalWeightCg);
        withinTol = isWithinTolerance(totalWeightCg, currentTotalWeightCg);
      }

      // Crear el pesaje
      const weighing = await tx.weighing.create({
        data: {
          trayId,
          type,
          totalWeightCg,
          trayWeightCg,
          goldWeightCg,
          pieceCount,
          operator,
          notes,
          previousGoldWeightCg: previousTotalWeightCg,
          differenceCg: diffCg,
          withinTolerance: withinTol,
        },
      });

      // Actualizar la bandeja solo en pesaje de apertura.
      // El cierre solo registra la medición y la diferencia, no modifica los datos de la bandeja.
      if (type === 'OPENING') {
        await tx.tray.update({
          where: { id: trayId },
          data: {
            goldWeightCg,
            pieceCount,
            trayWeightCg,
          },
        });
      }

      // Registrar movimiento de inventario si hay peso anterior para comparar
      if (previousTotalWeightCg > 0) {
        await tx.inventoryMovement.create({
          data: {
            trayId,
            type: 'WEIGHING',
            previousWeightCg: previousTotalWeightCg,
            newWeightCg: totalWeightCg,
            differenceCg: diffCg,
            reason: `Pesaje ${type === 'OPENING' ? 'de apertura' : 'de cierre'}${
              !withinTol ? ' - FUERA DE TOLERANCIA' : ''
            }`,
            operator,
          },
        });
      }

      // Registrar log de auditoría
      await tx.auditLog.create({
        data: {
          action: 'WEIGHING_CREATED',
          entity: 'Weighing',
          entityId: weighing.id,
          details: JSON.stringify({
            trayId,
            type,
            totalWeightCg,
            goldWeightCg,
            pieceCount,
            previousTotalWeightCg,
            differenceCg: diffCg,
            withinTolerance: withinTol,
            warnings: validation.warnings,
          }),
          operator,
        },
      });

      await deleteCache(`tray:${trayId}`);
      await deleteCache('trays:all');

      return {
        ...weighing,
        warnings: validation.warnings,
        comparison: previousTotalWeightCg > 0 ? {
          previousTotalWeightCg,
          differenceCg: diffCg,
          withinTolerance: withinTol,
        } : null,
      };
    });
  }

  async validateClosingWeighing(trayId: string): Promise<{
    isValid: boolean;
    currentTotalWeightCg: number;
    message: string;
  }> {
    const currentTray = await this.getCurrentTrayData(trayId);

    if (!currentTray || currentTray.goldWeightCg === 0) {
      return {
        isValid: false,
        currentTotalWeightCg: 0,
        message: 'No hay peso registrado en la bandeja para validar',
      };
    }

    const currentTotalWeightCg = currentTray.goldWeightCg + currentTray.trayWeightCg;
    return {
      isValid: true,
      currentTotalWeightCg,
      message: `Peso total en bandeja: ${centigramsToGrams(currentTotalWeightCg).toFixed(2)}g (oro ${centigramsToGrams(currentTray.goldWeightCg).toFixed(2)}g + bandeja ${centigramsToGrams(currentTray.trayWeightCg).toFixed(2)}g)`,
    };
  }

  async compareWithPreviousWeighing(trayId: string, currentGoldWeightCg: number): Promise<{
    withinTolerance: boolean;
    differenceCg: number;
    previousWeightCg: number;
    message: string;
  }> {
    const lastWeighing = await this.getLastWeighing(trayId);

    if (!lastWeighing) {
      return {
        withinTolerance: true,
        differenceCg: 0,
        previousWeightCg: 0,
        message: 'No hay pesaje anterior para comparar',
      };
    }

    const diffCg = calculateDifference(currentGoldWeightCg, lastWeighing.goldWeightCg);
    const withinTol = isWithinTolerance(currentGoldWeightCg, lastWeighing.goldWeightCg);

    return {
      withinTolerance: withinTol,
      differenceCg: diffCg,
      previousWeightCg: lastWeighing.goldWeightCg,
      message: withinTol
        ? `Diferencia dentro del margen: ${centigramsToGrams(Math.abs(diffCg)).toFixed(2)}g (tolerancia: ±${centigramsToGrams(WEIGHING_TOLERANCE_CG).toFixed(2)}g)`
        : `Diferencia excede el margen: ${centigramsToGrams(Math.abs(diffCg)).toFixed(2)}g (tolerancia: ±${centigramsToGrams(WEIGHING_TOLERANCE_CG).toFixed(2)}g)`,
    };
  }

  async getWeighingsByTray(trayId: string, limit: number = 50) {
    const weighings = await prisma.weighing.findMany({
      where: { trayId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return weighings;
  }

  async getWeighingsByDate(date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const weighings = await prisma.weighing.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        tray: true,
      },
    });
    return weighings;
  }

  async getTodayOpeningWeighings() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const weighings = await prisma.weighing.findMany({
      where: {
        type: 'OPENING',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        tray: true,
      },
    });
    return weighings;
  }

  async getTodayClosingWeighings() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const weighings = await prisma.weighing.findMany({
      where: {
        type: 'CLOSING',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        tray: true,
      },
    });
    return weighings;
  }
}

export const weighingService = new WeighingService();
