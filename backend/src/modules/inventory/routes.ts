import { Router } from 'express';
import { trayController } from './TrayController';
import { weighingController } from './WeighingController';
import { transferController } from './TransferController';
import { validateId, validateJson } from '../../middleware/errorHandler';

const router = Router();

// Tray routes
router.get('/trays', trayController.getAll);
router.get('/trays/:id', validateId(), trayController.getById);
router.get('/trays/gold-type/:goldType', trayController.getByGoldType);
router.post('/trays', validateJson, trayController.create);
router.put('/trays/:id', validateId(), validateJson, trayController.update);
router.patch('/trays/:id/status', validateId(), validateJson, trayController.updateStatus);
router.delete('/trays/:id', validateId(), trayController.delete);

// Weighing routes (more specific routes first!)
router.post('/weighings', validateJson, weighingController.create);
router.post('/weighings/validate', validateJson, weighingController.validateWeighing);
router.get('/weighings/tray/:trayId/day-state', validateId('trayId'), weighingController.getTrayDayState);
router.get('/weighings/tray/:trayId', validateId('trayId'), weighingController.getByTray);
router.get('/weighings/date/:date', weighingController.getByDate);
router.get('/weighings/today/openings', weighingController.getTodayOpenings);
router.get('/weighings/today/closings', weighingController.getTodayClosings);
router.get('/weighings/validate-closing/:trayId', validateId('trayId'), weighingController.validateClosing);
router.post('/weighings/compare/:trayId', validateId('trayId'), validateJson, weighingController.compareWithPrevious);

// Transfer routes
router.post('/transfers', validateJson, transferController.create);
router.get('/transfers/today', transferController.getToday);
router.get('/transfers', transferController.getAll);

export default router;
