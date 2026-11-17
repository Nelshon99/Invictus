import prisma from '../utils/database';
import { deleteCache } from '../utils/redis';

export class ReconciliationService {
  async getTodayReconciliation() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    let reconciliation = await prisma.dailyReconciliation.findUnique({
      where: { date: today },
    });

    // Si no existe, crear automáticamente un registro OPEN con los totales del día
    if (!reconciliation) {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: today,
            lte: endOfDay,
          },
        },
        include: {
          payments: true,
        },
      });

      const totalSales = sales.reduce((sum: number, sale: any) => sum + sale.amount, 0);
      const cashTotal = sales
        .flatMap((sale: any) => sale.payments)
        .filter((p: any) => p.method === 'CASH')
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      const transferTotal = sales
        .flatMap((sale: any) => sale.payments)
        .filter((p: any) => p.method === 'TRANSFER')
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      const cardTotal = sales
        .flatMap((sale: any) => sale.payments)
        .filter((p: any) => p.method === 'CARD')
        .reduce((sum: number, p: any) => sum + p.amount, 0);
      const creditTotal = sales
        .flatMap((sale: any) => sale.payments)
        .filter((p: any) => p.method === 'CREDIT')
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      reconciliation = await prisma.dailyReconciliation.create({
        data: {
          date: today,
          totalSales,
          cashTotal,
          transferTotal,
          cardTotal,
          creditTotal,
          status: 'OPEN',
        },
      });
    }

    return reconciliation;
  }

  async getReconciliationByDate(date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const reconciliation = await prisma.dailyReconciliation.findUnique({
      where: { date: targetDate },
    });

    return reconciliation;
  }

  async closeReconciliation(date: Date, operator: string, discrepancies?: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const reconciliation = await prisma.dailyReconciliation.findUnique({
      where: { date: targetDate },
    });

    let updated;
    if (!reconciliation) {
      // No hay ventas del día: crear y cerrar el registro en una sola operación
      updated = await prisma.dailyReconciliation.create({
        data: {
          date: targetDate,
          totalSales: 0,
          cashTotal: 0,
          transferTotal: 0,
          cardTotal: 0,
          creditTotal: 0,
          status: 'CLOSED',
          closedBy: operator,
          closedAt: new Date(),
          discrepancies: discrepancies || null,
        },
      });
    } else {
      updated = await prisma.dailyReconciliation.update({
        where: { date: targetDate },
        data: {
          status: 'CLOSED',
          closedBy: operator,
          closedAt: new Date(),
          discrepancies: discrepancies || reconciliation.discrepancies,
        },
      });
    }

    await deleteCache('reconciliation:today');
    return updated;
  }

  async getReconciliationHistory(limit: number = 30) {
    const reconciliations = await prisma.dailyReconciliation.findMany({
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });
    return reconciliations;
  }

  async validateReconciliation(date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reconciliation = await prisma.dailyReconciliation.findUnique({
      where: { date: targetDate },
    });

    if (!reconciliation) {
      return {
        isValid: true,
        message: 'No hay conciliación para validar',
      };
    }

    // Obtener todas las ventas del día
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: targetDate,
          lte: endOfDay,
        },
      },
      include: {
        payments: true,
      },
    });

    // Calcular totales desde las ventas
    const calculatedTotal = sales.reduce((sum: number, sale: any) => sum + sale.amount, 0);
    const calculatedCash = sales
      .flatMap((sale: any) => sale.payments)
      .filter((p: any) => p.method === 'CASH')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const calculatedTransfer = sales
      .flatMap((sale: any) => sale.payments)
      .filter((p: any) => p.method === 'TRANSFER')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const calculatedCard = sales
      .flatMap((sale: any) => sale.payments)
      .filter((p: any) => p.method === 'CARD')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const calculatedCredit = sales
      .flatMap((sale: any) => sale.payments)
      .filter((p: any) => p.method === 'CREDIT')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const discrepancies: string[] = [];
    if (Math.abs(calculatedTotal - reconciliation.totalSales) > 0.01) {
      discrepancies.push(`Total: esperado ${calculatedTotal}, registrado ${reconciliation.totalSales}`);
    }
    if (Math.abs(calculatedCash - reconciliation.cashTotal) > 0.01) {
      discrepancies.push(`Efectivo: esperado ${calculatedCash}, registrado ${reconciliation.cashTotal}`);
    }
    if (Math.abs(calculatedTransfer - reconciliation.transferTotal) > 0.01) {
      discrepancies.push(`Transferencia: esperado ${calculatedTransfer}, registrado ${reconciliation.transferTotal}`);
    }
    if (Math.abs(calculatedCard - reconciliation.cardTotal) > 0.01) {
      discrepancies.push(`Tarjeta: esperado ${calculatedCard}, registrado ${reconciliation.cardTotal}`);
    }
    if (Math.abs(calculatedCredit - reconciliation.creditTotal) > 0.01) {
      discrepancies.push(`Crédito: esperado ${calculatedCredit}, registrado ${reconciliation.creditTotal}`);
    }

    return {
      isValid: discrepancies.length === 0,
      discrepancies: discrepancies.join('; '),
      message: discrepancies.length === 0
        ? 'Conciliación válida'
        : `Discrepancias encontradas: ${discrepancies.join('; ')}`,
    };
  }
}

export const reconciliationService = new ReconciliationService();
