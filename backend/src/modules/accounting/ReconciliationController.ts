import { Request, Response } from 'express';
import { reconciliationService } from '../../services/ReconciliationService';
import { AppRequest } from '../../middleware/errorHandler';

export class ReconciliationController {
  async getToday(req: Request, res: Response) {
    const reconciliation = await reconciliationService.getTodayReconciliation();
    res.json({
      success: true,
      data: reconciliation,
    });
  }

  async getByDate(req: Request, res: Response) {
    const { date } = req.params;
    const reconciliation = await reconciliationService.getReconciliationByDate(new Date(date));
    res.json({
      success: true,
      data: reconciliation,
    });
  }

  async close(req: AppRequest, res: Response) {
    const { date, closedBy, discrepancies } = req.body;
    const operator = closedBy || req.operator || 'system';
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const result = await reconciliationService.closeReconciliation(targetDate, operator, discrepancies);
    res.json({
      success: true,
      data: result,
    });
  }

  async getHistory(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 30;
    const history = await reconciliationService.getReconciliationHistory(limit);
    res.json({
      success: true,
      data: history,
    });
  }

  async validate(req: Request, res: Response) {
    const { date } = req.params;
    const validation = await reconciliationService.validateReconciliation(new Date(date));
    res.json({
      success: true,
      data: validation,
    });
  }

}

export const reconciliationController = new ReconciliationController();
