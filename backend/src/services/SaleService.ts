import prisma from '../utils/database';
import { hasEnoughWeight, isValidWeight } from '../utils/helpers';
import { deleteCache } from '../utils/redis';

export interface PaymentData {
  method: string; // CASH, TRANSFER, CARD, CREDIT, MIXED
  amount: number;
  transactionId?: string;
  bankAccountId?: string;
  notes?: string;
}

export interface CreateSaleData {
  trayId: string;
  goldWeightCg: number;
  goldType: string; // ITALIANO or NACIONAL
  amount: number;
  payments: PaymentData[];
  operator: string;
  notes?: string;
}

export class SaleService {
  async createSale(data: CreateSaleData): Promise<any> {
    const { trayId, goldWeightCg, goldType, amount, payments, operator, notes } = data;

    if (!isValidWeight(goldWeightCg)) {
      throw new Error('El peso del oro no puede ser negativo');
    }

    if (amount <= 0) {
      throw new Error('El monto de la venta debe ser mayor a 0');
    }

    if (!payments || payments.length === 0) {
      throw new Error('Se requiere al menos un método de pago');
    }

    // Validar que los pagos suman el monto total
    const totalPayments = payments.reduce((sum: number, p: PaymentData) => sum + p.amount, 0);
    if (Math.abs(totalPayments - amount) > 0.01) {
      throw new Error(`La suma de pagos (${totalPayments}) no coincide con el monto (${amount})`);
    }

    return await prisma.$transaction(async (tx: any) => {
      // Validar que la bandeja existe y tiene suficiente peso
      const tray = await tx.tray.findUnique({ where: { id: trayId } });
      if (!tray) {
        throw new Error('Bandeja no encontrada');
      }

      // Bloquear ventas si la bandeja ya tiene cierre del día
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayClosingCount = await tx.weighing.count({
        where: {
          trayId,
          type: 'CLOSING',
          createdAt: { gte: startOfDay },
        },
      });
      if (todayClosingCount > 0) {
        throw new Error('No se pueden registrar ventas: la bandeja ya tiene el cierre del día registrado. Use traslados para mover oro entre bandejas.');
      }

      if (!hasEnoughWeight(tray.goldWeightCg, goldWeightCg)) {
        throw new Error(
          `Peso insuficiente en bandeja. Disponible: ${tray.goldWeightCg} cg, Solicitado: ${goldWeightCg} cg`
        );
      }

      // Validar que el tipo de oro coincide
      if (tray.goldType !== goldType) {
        throw new Error(
          `Tipo de oro no coincide. Bandeja: ${tray.goldType}, Venta: ${goldType}`
        );
      }

      // Evento 1: Crear la venta
      const sale = await tx.sale.create({
        data: {
          trayId,
          goldWeightCg,
          goldType,
          amount,
          operator,
          notes,
          payments: {
            create: payments.map((p: PaymentData) => ({
              method: p.method,
              amount: p.amount,
              status: 'CONFIRMED',
              transactionId: p.transactionId,
              bankAccountId: p.bankAccountId || null,
              notes: p.notes,
            })),
          },
        },
        include: {
          payments: {
            include: {
              bankAccount: true,
            },
          },
        },
      });

      // Evento 2: Descontar peso de bandeja
      const newGoldWeight = tray.goldWeightCg - goldWeightCg;
      await tx.tray.update({
        where: { id: trayId },
        data: {
          goldWeightCg: newGoldWeight,
        },
      });

      // Evento 3: Registrar movimiento de inventario
      await tx.inventoryMovement.create({
        data: {
          trayId,
          type: 'SALE',
          previousWeightCg: tray.goldWeightCg,
          newWeightCg: newGoldWeight,
          differenceCg: -goldWeightCg,
          reason: `Venta #${sale.id}`,
          referenceId: sale.id,
          operator,
        },
      });

      // Evento 4: Generar log de auditoría
      await tx.auditLog.create({
        data: {
          action: 'SALE_CREATED',
          entity: 'Sale',
          entityId: sale.id,
          details: JSON.stringify({
            trayId,
            goldWeightCg,
            goldType,
            amount,
            payments: payments.map((p: PaymentData) => ({
              method: p.method,
              amount: p.amount,
            })),
          }),
          operator,
        },
      });

      // Actualizar conciliación diaria
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reconciliation = await tx.dailyReconciliation.upsert({
        where: { date: today },
        create: {
          date: today,
          totalSales: amount,
          cashTotal: payments.filter((p: PaymentData) => p.method === 'CASH').reduce((s: number, p: PaymentData) => s + p.amount, 0),
          transferTotal: payments.filter((p: PaymentData) => p.method === 'TRANSFER').reduce((s: number, p: PaymentData) => s + p.amount, 0),
          cardTotal: payments.filter((p: PaymentData) => p.method === 'CARD').reduce((s: number, p: PaymentData) => s + p.amount, 0),
          creditTotal: payments.filter((p: PaymentData) => p.method === 'CREDIT').reduce((s: number, p: PaymentData) => s + p.amount, 0),
        },
        update: {
          totalSales: { increment: amount },
          cashTotal: { increment: payments.filter((p: PaymentData) => p.method === 'CASH').reduce((s: number, p: PaymentData) => s + p.amount, 0) },
          transferTotal: { increment: payments.filter((p: PaymentData) => p.method === 'TRANSFER').reduce((s: number, p: PaymentData) => s + p.amount, 0) },
          cardTotal: { increment: payments.filter((p: PaymentData) => p.method === 'CARD').reduce((s: number, p: PaymentData) => s + p.amount, 0) },
          creditTotal: { increment: payments.filter((p: PaymentData) => p.method === 'CREDIT').reduce((s: number, p: PaymentData) => s + p.amount, 0) },
        },
      });

      await deleteCache(`tray:${trayId}`);
      await deleteCache('trays:all');

      return {
        sale,
        reconciliation,
        message: 'Venta registrada exitosamente',
      };
    });
  }

  async getSalesByDate(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        tray: true,
        payments: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return sales;
  }

  async getSalesByTray(trayId: string, limit: number = 50) {
    const sales = await prisma.sale.findMany({
      where: { trayId },
      include: {
        payments: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    return sales;
  }

  async getTodaySales() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
      include: {
        tray: true,
        payments: {
          include: {
            bankAccount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return sales;
  }

  async getSaleById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        tray: true,
        payments: {
          include: {
            bankAccount: true,
          },
        },
      },
    });
    if (!sale) {
      throw new Error('Venta no encontrada');
    }
    return sale;
  }
}

export const saleService = new SaleService();
