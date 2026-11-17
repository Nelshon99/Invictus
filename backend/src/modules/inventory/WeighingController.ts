import { Request, Response } from 'express';
import { weighingService } from '../../services/WeighingService';
import { AppRequest } from '../../middleware/errorHandler';

export class WeighingController {
  async create(req: AppRequest, res: Response) {
    const weighing = await weighingService.createWeighing(req.body);
    res.status(201).json({
      success: true,
      data: weighing,
    });
  }

  async getByTray(req: Request, res: Response) {
    const { trayId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const weighings = await weighingService.getWeighingsByTray(trayId, limit);
    res.json({
      success: true,
      data: weighings,
    });
  }

  async getByDate(req: Request, res: Response) {
    const { date } = req.params;
    const weighings = await weighingService.getWeighingsByDate(new Date(date));
    res.json({
      success: true,
      data: weighings,
    });
  }

  async getTodayOpenings(req: Request, res: Response) {
    const weighings = await weighingService.getTodayOpeningWeighings();
    res.json({
      success: true,
      data: weighings,
    });
  }

  async getTodayClosings(req: Request, res: Response) {
    const weighings = await weighingService.getTodayClosingWeighings();
    res.json({
      success: true,
      data: weighings,
    });
  }

  async validateClosing(req: Request, res: Response) {
    const { trayId } = req.params;
    const validation = await weighingService.validateClosingWeighing(trayId);
    res.json({
      success: true,
      data: validation,
    });
  }

  async compareWithPrevious(req: AppRequest, res: Response) {
    const { trayId } = req.params;
    const { goldWeightCg } = req.body;
    const comparison = await weighingService.compareWithPreviousWeighing(trayId, goldWeightCg);
    res.json({
      success: true,
      data: comparison,
    });
  }

  // Validación en tiempo real antes de crear un pesaje
  async validateWeighing(req: AppRequest, res: Response) {
    const validation = await weighingService.validateWeighing(req.body);
    res.json({
      success: true,
      data: validation,
    });
  }

  // Estado del día para una bandeja
  async getTrayDayState(req: Request, res: Response) {
    const { trayId } = req.params;
    const state = await weighingService.getTrayDayState(trayId);
    res.json({
      success: true,
      data: { state },
    });
  }
}

export const weighingController = new WeighingController();
