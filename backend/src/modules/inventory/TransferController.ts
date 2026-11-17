import { Request, Response } from 'express';
import { transferService } from '../../services/TransferService';
import { AppRequest } from '../../middleware/errorHandler';

export class TransferController {
  async create(req: AppRequest, res: Response) {
    const transfer = await transferService.createTransfer(req.body);
    res.status(201).json({
      success: true,
      data: transfer,
    });
  }

  async getToday(req: Request, res: Response) {
    const transfers = await transferService.getTodayTransfers();
    res.json({
      success: true,
      data: transfers,
    });
  }

  async getAll(req: Request, res: Response) {
    const transfers = await transferService.getAllTransfers();
    res.json({
      success: true,
      data: transfers,
    });
  }
}

export const transferController = new TransferController();
