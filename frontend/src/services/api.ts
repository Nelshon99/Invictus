import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para extraer automáticamente response.data.data de las respuestas del backend
api.interceptors.response.use(
  (response) => {
    // El backend devuelve { success: true, data: [...] }
    // Extraemos solo el data para que el frontend reciba directamente los datos
    if (response.data && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Inventory API
export const inventoryApi = {
  // Trays
  getTrays: () => api.get('/inventory/trays'),
  getTrayById: (id: string) => api.get(`/inventory/trays/${id}`),
  getTraysByGoldType: (goldType: string) => api.get(`/inventory/trays/gold-type/${goldType}`),
  createTray: (data: any) => api.post('/inventory/trays', data),
  updateTray: (id: string, data: any) => api.put(`/inventory/trays/${id}`, data),
  deleteTray: (id: string) => api.delete(`/inventory/trays/${id}`),
  updateTrayStatus: (id: string, status: string) => api.patch(`/inventory/trays/${id}/status`, { status }),

  // Weighings
  createWeighing: (data: any) => api.post('/inventory/weighings', data),
  validateWeighing: (data: any) => api.post('/inventory/weighings/validate', data),
  getTrayDayState: (trayId: string) => api.get(`/inventory/weighings/tray/${trayId}/day-state`),
  getWeighingsByTray: (trayId: string, limit = 50) =>
    api.get(`/inventory/weighings/tray/${trayId}`, { params: { limit } }),
  getWeighingsByDate: (date: string) => api.get(`/inventory/weighings/date/${date}`),
  getTodayOpenings: () => api.get('/inventory/weighings/today/openings'),
  getTodayClosings: () => api.get('/inventory/weighings/today/closings'),
  validateClosing: (trayId: string) => api.get(`/inventory/weighings/validate-closing/${trayId}`),
  compareWithPrevious: (trayId: string, goldWeightCg: number) =>
    api.post(`/inventory/weighings/compare/${trayId}`, { goldWeightCg }),
};

// Accounting API
export const accountingApi = {
  // Sales
  createSale: (data: any) => api.post('/accounting/sales', data),
  getSaleById: (id: string) => api.get(`/accounting/sales/${id}`),
  getTodaySales: () => api.get('/accounting/sales/today'),
  getSalesByDate: (date: string) => api.get(`/accounting/sales/date/${date}`),
  getSalesByTray: (trayId: string, limit = 50) =>
    api.get(`/accounting/sales/tray/${trayId}`, { params: { limit } }),

  // Reconciliation
  getTodayReconciliation: () => api.get('/accounting/reconciliation/today'),
  getReconciliationByDate: (date: string) => api.get(`/accounting/reconciliation/date/${date}`),
  closeReconciliation: (data: any) => api.post('/accounting/reconciliation/close', data),
  getReconciliationHistory: (limit = 30) =>
    api.get('/accounting/reconciliation/history', { params: { limit } }),
  validateReconciliation: (date: string) =>
    api.get(`/accounting/reconciliation/validate/${date}`),

  // Bank Accounts
  getBankAccounts: (activeOnly = true) =>
    api.get('/accounting/bank-accounts', { params: { activeOnly } }),
  getBankAccountById: (id: string) => api.get(`/accounting/bank-accounts/${id}`),
  createBankAccount: (data: any) => api.post('/accounting/bank-accounts', data),
  updateBankAccount: (id: string, data: any) => api.put(`/accounting/bank-accounts/${id}`, data),
  deleteBankAccount: (id: string) => api.delete(`/accounting/bank-accounts/${id}`),
};

// Transfers API
export const transfersApi = {
  createTransfer: (data: any) => api.post('/inventory/transfers', data),
  getTodayTransfers: () => api.get('/inventory/transfers/today'),
  getAllTransfers: () => api.get('/inventory/transfers'),
};

// Logs API
export const logsApi = {
  getRecentLogs: (limit = 100) =>
    api.get('/logs/audit/recent', { params: { limit } }),
  getTodayLogs: () => api.get('/logs/audit/today'),
  getLogsByEntity: (entity: string, limit = 50) =>
    api.get(`/logs/audit/entity/${entity}`, { params: { limit } }),
  getLogsByOperator: (operator: string, limit = 50) =>
    api.get(`/logs/audit/operator/${operator}`, { params: { limit } }),
  getLogsByDateRange: (startDate: string, endDate: string, limit = 100) =>
    api.get('/logs/audit/range', { params: { startDate, endDate, limit } }),
};

export default api;
