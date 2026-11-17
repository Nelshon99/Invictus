import { Request, Response } from 'express';
import { bankAccountService } from '../../services/BankAccountService';
import { AppRequest } from '../../middleware/errorHandler';

export class BankAccountController {
  async getAll(req: Request, res: Response) {
    const activeOnly = req.query.activeOnly !== 'false';
    const accounts = await bankAccountService.getAll(activeOnly);
    res.json({
      success: true,
      data: accounts,
    });
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const account = await bankAccountService.getById(id);
    res.json({
      success: true,
      data: account,
    });
  }

  async create(req: AppRequest, res: Response) {
    const account = await bankAccountService.create(req.body);
    res.status(201).json({
      success: true,
      data: account,
    });
  }

  async update(req: AppRequest, res: Response) {
    const { id } = req.params;
    const account = await bankAccountService.update(id, req.body);
    res.json({
      success: true,
      data: account,
    });
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;
    const result = await bankAccountService.delete(id);
    res.json({
      success: true,
      data: result,
    });
  }
}

export const bankAccountController = new BankAccountController();
