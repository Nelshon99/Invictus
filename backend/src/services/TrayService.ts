import prisma from '../utils/database';
import { deleteCache } from '../utils/redis';
import { AppError } from '../utils/appError';

export interface CreateTrayData {
  code: string;
  name: string;
  goldType: string; // ITALIANO or NACIONAL
  trayWeightCg: number;
  goldWeightCg?: number;
  pieceCount?: number;
  trayType?: string; // EXHIBIDO or PROVEEDOR
  supplierName?: string;
  supplierPhone?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseNotes?: string;
}

export interface UpdateTrayData {
  name?: string;
  trayWeightCg?: number;
  goldWeightCg?: number;
  pieceCount?: number;
  status?: string;
  trayType?: string;
  supplierName?: string;
  supplierPhone?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseNotes?: string;
}

export class TrayService {
  async getAllTrays(): Promise<any[]> {
    const trays = await prisma.tray.findMany({
      orderBy: {
        code: 'asc',
      },
    });
    await deleteCache('trays:all');
    return trays;
  }

  async getTrayById(id: string) {
    const tray = await prisma.tray.findUnique({
      where: { id },
    });
    if (!tray) {
      throw new Error('Bandeja no encontrada');
    }
    return tray;
  }

  async getTrayByCode(code: string) {
    const tray = await prisma.tray.findUnique({
      where: { code },
    });
    return tray;
  }

  async createTray(data: CreateTrayData) {
    const existing = await prisma.tray.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new Error(`Ya existe una bandeja con código ${data.code}`);
    }

    const tray = await prisma.tray.create({
      data: {
        code: data.code,
        name: data.name,
        goldType: data.goldType,
        trayWeightCg: data.trayWeightCg,
        goldWeightCg: data.goldWeightCg || 0,
        pieceCount: data.pieceCount || 0,
        trayType: data.trayType || 'EXHIBIDO',
        supplierName: data.supplierName,
        supplierPhone: data.supplierPhone,
        purchasePrice: data.purchasePrice,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchaseNotes: data.purchaseNotes,
      },
    });

    await deleteCache('trays:all');
    return tray;
  }

  async updateTray(id: string, data: UpdateTrayData) {
    const existing = await this.getTrayById(id);

    const tray = await prisma.tray.update({
      where: { id },
      data,
    });

    await deleteCache(`tray:${id}`);
    await deleteCache('trays:all');
    return tray;
  }

  async deleteTray(id: string) {
    const existing = await this.getTrayById(id);

    if (existing.status === 'ACTIVE') {
      throw new AppError('No se puede eliminar una bandeja activa. Desactívela primero.', 400);
    }

    // Verificar si hay registros relacionados antes de eliminar
    const weighingCount = await prisma.weighing.count({ where: { trayId: id } });
    const saleCount = await prisma.sale.count({ where: { trayId: id } });

    if (weighingCount > 0 || saleCount > 0) {
      const reasons: string[] = [];
      if (weighingCount > 0) reasons.push(`${weighingCount} pesaje(s)`);
      if (saleCount > 0) reasons.push(`${saleCount} venta(s)`);
      throw new AppError(`No se puede eliminar: la bandeja tiene ${reasons.join(' y ')} asociados.`, 400);
    }

    await prisma.tray.delete({
      where: { id },
    });

    await deleteCache(`tray:${id}`);
    await deleteCache('trays:all');
    return { message: 'Bandeja eliminada exitosamente' };
  }

  async updateTrayStatus(id: string, status: string) {
    const tray = await this.updateTray(id, { status });
    return tray;
  }

  async getTraysByGoldType(goldType: string) {
    const trays = await prisma.tray.findMany({
      where: {
        goldType,
        status: 'ACTIVE',
      },
      orderBy: {
        code: 'asc',
      },
    });
    return trays;
  }
}

export const trayService = new TrayService();
