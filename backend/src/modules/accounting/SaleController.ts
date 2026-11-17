import { Request, Response } from 'express';
import { saleService } from '../../services/SaleService';
import { AppRequest } from '../../middleware/errorHandler';

export class SaleController {
  async create(req: AppRequest, res: Response) {
    const result = await saleService.createSale(req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    const sale = await saleService.getSaleById(id);
    res.json({
      success: true,
      data: sale,
    });
  }

  async getToday(req: Request, res: Response) {
    const sales = await saleService.getTodaySales();
    res.json({
      success: true,
      data: sales,
    });
  }

  async getByDate(req: Request, res: Response) {
    const { date } = req.params;
    const sales = await saleService.getSalesByDate(new Date(date));
    res.json({
      success: true,
      data: sales,
    });
  }

  async getByTray(req: Request, res: Response) {
    const { trayId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const sales = await saleService.getSalesByTray(trayId, limit);
    res.json({
      success: true,
      data: sales,
    });
  }
}

export const saleController = new SaleController();
