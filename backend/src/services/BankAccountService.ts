import prisma from '../utils/database';
import { deleteCache } from '../utils/redis';

export interface CreateBankAccountData {
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: string; // CORRIENTE, AHORROS, NEGOCIOS
  notes?: string;
}

export interface UpdateBankAccountData {
  name?: string;
  bankName?: string;
  accountNumber?: string;
  accountType?: string;
  status?: string;
  notes?: string;
}

export class BankAccountService {
  async getAll(activeOnly: boolean = true) {
    const where = activeOnly ? { status: 'ACTIVE' } : {};
    const accounts = await prisma.bankAccount.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return accounts;
  }

  async getById(id: string) {
    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });
    if (!account) {
      throw new Error('Cuenta bancaria no encontrada');
    }
    return account;
  }

  async create(data: CreateBankAccountData) {
    const { name, bankName, accountNumber, accountType, notes } = data;

    if (!name || !bankName || !accountNumber || !accountType) {
      throw new Error('Todos los campos obligatorios deben ser completados');
    }

    if (!['CORRIENTE', 'AHORROS', 'NEGOCIOS'].includes(accountType)) {
      throw new Error('Tipo de cuenta inválido. Debe ser CORRIENTE, AHORROS o NEGOCIOS');
    }

    const existing = await prisma.bankAccount.findFirst({
      where: { bankName, accountNumber },
    });
    if (existing) {
      throw new Error('Ya existe una cuenta con este número en el mismo banco');
    }

    const account = await prisma.bankAccount.create({
      data: {
        name,
        bankName,
        accountNumber,
        accountType,
        notes: notes || null,
      },
    });

    await deleteCache('bankAccounts:all');
    return account;
  }

  async update(id: string, data: UpdateBankAccountData) {
    const existing = await prisma.bankAccount.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error('Cuenta bancaria no encontrada');
    }

    if (data.bankName || data.accountNumber) {
      const duplicate = await prisma.bankAccount.findFirst({
        where: {
          bankName: data.bankName || existing.bankName,
          accountNumber: data.accountNumber || existing.accountNumber,
          id: { not: id },
        },
    });
      if (duplicate) {
        throw new Error('Ya existe una cuenta con este número en el mismo banco');
      }
    }

    if (data.accountType && !['CORRIENTE', 'AHORROS', 'NEGOCIOS'].includes(data.accountType)) {
      throw new Error('Tipo de cuenta inválido. Debe ser CORRIENTE, AHORROS o NEGOCIOS');
    }

    const account = await prisma.bankAccount.update({
      where: { id },
      data,
    });

    await deleteCache(`bankAccount:${id}`);
    await deleteCache('bankAccounts:all');
    return account;
  }

  async delete(id: string) {
    const account = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        payments: {
          select: { id: true },
        },
      },
    });
    if (!account) {
      throw new Error('Cuenta bancaria no encontrada');
    }

    if (account.payments.length > 0) {
      throw new Error('No se puede eliminar una cuenta que tiene pagos asociados');
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    await deleteCache(`bankAccount:${id}`);
    await deleteCache('bankAccounts:all');
    return { message: 'Cuenta bancaria eliminada exitosamente' };
  }
}

export const bankAccountService = new BankAccountService();
