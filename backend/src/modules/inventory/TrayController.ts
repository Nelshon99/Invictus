import { Request, Response } from 'express';
import { trayService } from '../../services/TrayService';
import { AppRequest } from '../../middleware/errorHandler';

export class TrayController {
  async getAll(req: Request, res: Response) {
    const trays = await trayService.getAllTrays();
    res.json({
      success: true,
      data: trays,
    });
  }

  async getById(req: AppRequest, res: Response) {
    const { id } = req.params;
    const tray = await trayService.getTrayById(id);
    res.json({
      success: true,
      data: tray,
    });
  }

  async create(req: AppRequest, res: Response) {
    const tray = await trayService.createTray(req.body);
    res.status(201).json({
      success: true,
      data: tray,
    });
  }

  async update(req: AppRequest, res: Response) {
    const { id } = req.params;
    const tray = await trayService.updateTray(id, req.body);
    res.json({
      success: true,
      data: tray,
    });
  }

  async delete(req: AppRequest, res: Response) {
    const { id } = req.params;
    const result = await trayService.deleteTray(id);
    res.json({
      success: true,
      ...result,
    });
  }

  async updateStatus(req: AppRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'El estado debe ser ACTIVE o INACTIVE',
        },
      });
      return;
    }
    const tray = await trayService.updateTrayStatus(id, status);
    res.json({
      success: true,
      data: tray,
    });
  }

  async getByGoldType(req: Request, res: Response) {
    const { goldType } = req.params;
    const trays = await trayService.getTraysByGoldType(goldType as any);
    res.json({
      success: true,
      data: trays,
    });
  }

}

export const trayController = new TrayController();
