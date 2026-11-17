import { Router } from 'express';
import { saleController } from './SaleController';
import { reconciliationController } from './ReconciliationController';
import { bankAccountController } from './BankAccountController';
import { validateId, validateJson } from '../../middleware/errorHandler';

const router = Router();

// Sales routes
router.post('/sales', validateJson, saleController.create);
router.get('/sales/today', saleController.getToday);
router.get('/sales/date/:date', saleController.getByDate);
router.get('/sales/:id', validateId(), saleController.getById);
router.get('/sales/tray/:trayId', validateId('trayId'), saleController.getByTray);

// Reconciliation routes
router.get('/reconciliation/today', reconciliationController.getToday);
router.get('/reconciliation/date/:date', reconciliationController.getByDate);
router.post('/reconciliation/close', validateJson, reconciliationController.close);
router.get('/reconciliation/history', reconciliationController.getHistory);
router.get('/reconciliation/validate/:date', reconciliationController.validate);

// Bank Account routes
router.get('/bank-accounts', bankAccountController.getAll);
router.get('/bank-accounts/:id', validateId(), bankAccountController.getById);
router.post('/bank-accounts', validateJson, bankAccountController.create);
router.put('/bank-accounts/:id', validateId(), validateJson, bankAccountController.update);
router.delete('/bank-accounts/:id', validateId(), bankAccountController.delete);

export default router;
