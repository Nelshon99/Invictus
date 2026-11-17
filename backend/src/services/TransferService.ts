import prisma from '../utils/database';
import { deleteCache } from '../utils/redis';

export interface CreateTransferData {
  sourceTrayId: string;
  destinationTrayId: string;
  pieces: number;
  gramsCg: number;
  operator: string;
  notes?: string;
}

export class TransferService {

  async createTransfer(data: CreateTransferData): Promise<any> {
    const { sourceTrayId, destinationTrayId, pieces, gramsCg, operator, notes } = data;

    // Validar que las bandejas son diferentes
    if (sourceTrayId === destinationTrayId) {
      throw new Error('La bandeja origen y destino deben ser diferentes');
    }

    // Validar que las piezas sean positivas
    if (pieces <= 0) {
      throw new Error('La cantidad de piezas debe ser mayor a 0');
    }

    return await prisma.$transaction(async (tx: any) => {
      // Obtener ambas bandejas
      const sourceTray = await tx.tray.findUnique({ where: { id: sourceTrayId } });
      const destTray = await tx.tray.findUnique({ where: { id: destinationTrayId } });

      if (!sourceTray) {
        throw new Error('Bandeja origen no encontrada');
      }
      if (!destTray) {
        throw new Error('Bandeja destino no encontrada');
      }

      // Validar que ambas bandejas estén activas
      if (sourceTray.status !== 'ACTIVE') {
        throw new Error(`La bandeja origen (${sourceTray.name}) no está activa`);
      }
      if (destTray.status !== 'ACTIVE') {
        throw new Error(`La bandeja destino (${destTray.name}) no está activa`);
      }

      // Validar que las leyes coincidan (ITALIANO a ITALIANO, NACIONAL a NACIONAL)
      if (sourceTray.goldType !== destTray.goldType) {
        throw new Error(
          `Las leyes no coinciden: la bandeja origen es ${sourceTray.goldType} y la destino es ${destTray.goldType}. ` +
          `Solo se pueden trasladar entre bandejas de la misma ley.`
        );
      }

      // Validar que la bandeja origen tenga suficientes piezas
      if (sourceTray.pieceCount < pieces) {
        throw new Error(
          `Piezas insuficientes: la bandeja origen tiene ${sourceTray.pieceCount} pieza(s) ` +
          `y se intentan trasladar ${pieces}`
        );
      }

      // Generar código de traslado
      const transferCount = await prisma.transfer.count();
      const code = `TRF-${String(transferCount + 1).padStart(4, '0')}`;

      // Crear el registro de traslado
      const transfer = await tx.transfer.create({
        data: {
          code,
          sourceTrayId,
          destinationTrayId,
          pieces,
          gramsCg,
          goldType: sourceTray.goldType,
          operator,
          notes,
        },
      });

      // Actualizar bandeja origen: restar piezas y gramos (gramos pueden quedar negativos)
      const newSourcePieces = sourceTray.pieceCount - pieces;
      const newSourceGrams = sourceTray.goldWeightCg - gramsCg;

      await tx.tray.update({
        where: { id: sourceTrayId },
        data: {
          pieceCount: newSourcePieces,
          goldWeightCg: newSourceGrams,
        },
      });

      // Registrar movimiento de inventario en bandeja origen
      await tx.inventoryMovement.create({
        data: {
          trayId: sourceTrayId,
          type: 'TRANSFER',
          previousWeightCg: sourceTray.goldWeightCg,
          newWeightCg: newSourceGrams,
          differenceCg: -gramsCg,
          reason: `Traslado ${code}: -${pieces} pieza(s), -${(gramsCg / 100).toFixed(2)}g a ${destTray.name}`,
          referenceId: transfer.id,
          operator,
        },
      });

      // Actualizar bandeja destino: sumar piezas y gramos
      const newDestPieces = destTray.pieceCount + pieces;
      const newDestGrams = destTray.goldWeightCg + gramsCg;

      await tx.tray.update({
        where: { id: destinationTrayId },
        data: {
          pieceCount: newDestPieces,
          goldWeightCg: newDestGrams,
        },
      });

      // Registrar movimiento de inventario en bandeja destino
      await tx.inventoryMovement.create({
        data: {
          trayId: destinationTrayId,
          type: 'TRANSFER',
          previousWeightCg: destTray.goldWeightCg,
          newWeightCg: newDestGrams,
          differenceCg: gramsCg,
          reason: `Traslado ${code}: +${pieces} pieza(s), +${(gramsCg / 100).toFixed(2)}g desde ${sourceTray.name}`,
          referenceId: transfer.id,
          operator,
        },
      });

      // Registrar log de auditoría
      await tx.auditLog.create({
        data: {
          action: 'TRANSFER_CREATED',
          entity: 'Transfer',
          entityId: transfer.id,
          details: JSON.stringify({
            code,
            sourceTrayId,
            sourceTrayName: sourceTray.name,
            destinationTrayId,
            destinationTrayName: destTray.name,
            pieces,
            gramsCg,
            goldType: sourceTray.goldType,
          }),
          operator,
        },
      });

      // Limpiar caché
      await deleteCache(`tray:${sourceTrayId}`);
      await deleteCache(`tray:${destinationTrayId}`);
      await deleteCache('trays:all');

      return {
        ...transfer,
        sourceTray: {
          id: sourceTray.id,
          code: sourceTray.code,
          name: sourceTray.name,
          goldType: sourceTray.goldType,
          pieceCount: newSourcePieces,
          goldWeightCg: newSourceGrams,
        },
        destinationTray: {
          id: destTray.id,
          code: destTray.code,
          name: destTray.name,
          goldType: destTray.goldType,
          pieceCount: newDestPieces,
          goldWeightCg: newDestGrams,
        },
      };
    });
  }

  async getTodayTransfers(): Promise<any[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return await prisma.transfer.findMany({
      where: {
        createdAt: { gte: startOfDay },
      },
      include: {
        sourceTray: {
          select: {
            code: true,
            name: true,
            goldType: true,
          },
        },
        destinationTray: {
          select: {
            code: true,
            name: true,
            goldType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllTransfers(): Promise<any[]> {
    return await prisma.transfer.findMany({
      include: {
        sourceTray: {
          select: {
            code: true,
            name: true,
            goldType: true,
          },
        },
        destinationTray: {
          select: {
            code: true,
            name: true,
            goldType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const transferService = new TransferService();
