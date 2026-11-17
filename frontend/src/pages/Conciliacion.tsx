import React, { useState, useEffect } from 'react';
import { accountingApi } from '../services/api';

interface Reconciliation {
  id: string;
  date: string;
  totalSales: number;
  cashTotal: number;
  transferTotal: number;
  cardTotal: number;
  creditTotal: number;
  discrepancies: string | null;
  status: string;
  closedBy: string | null;
  closedAt: string | null;
}

const Conciliacion: React.FC = () => {
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [history, setHistory] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeData, setCloseData] = useState({
    closedBy: '',
    discrepancies: '',
  });

  const fetchTodayReconciliation = async () => {
    try {
      setLoading(true);
      const response = await accountingApi.getTodayReconciliation();
      setReconciliation(response.data);
    } catch (err: any) {
      // No reconciliation yet for today
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await accountingApi.getReconciliationHistory(30);
      setHistory(response.data);
    } catch (err: any) {
      setError('Error al cargar historial: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  useEffect(() => {
    Promise.all([fetchTodayReconciliation(), fetchHistory()]);
  }, []);

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!closeData.closedBy) {
      setError('Ingresa el nombre de quien cierra el día');
      return;
    }


    try {
      await accountingApi.closeReconciliation({
        closedBy: closeData.closedBy,
        discrepancies: closeData.discrepancies || undefined,
      });
      setSuccess('Día cerrado exitosamente');
      setShowCloseForm(false);
      setCloseData({ closedBy: '', discrepancies: '' });
      fetchTodayReconciliation();
      fetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al cerrar el día');
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO');
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('es-CO');

  const paymentBreakdown = reconciliation ? [
    { method: 'Efectivo', amount: reconciliation.cashTotal, icon: '💵', color: 'green' },
    { method: 'Transferencia', amount: reconciliation.transferTotal, icon: '🏦', color: 'blue' },
    { method: 'Tarjeta', amount: reconciliation.cardTotal, icon: '💳', color: 'purple' },
    { method: 'Crédito', amount: reconciliation.creditTotal, icon: '📋', color: 'orange' },
  ] : [];

  const paymentsSum = paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
  const hasDiscrepancy = reconciliation && Math.abs(paymentsSum - reconciliation.totalSales) > 0.01;

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Conciliación Diaria</h1>
          <p className="text-sm text-stone-500 mt-1">Revisa y cierra el día con el resumen de pagos</p>
        </div>
        {reconciliation && reconciliation.status !== 'CLOSED' && (
          <button
            onClick={() => setShowCloseForm(true)}
            className="btn-primary"
          >
            <span>Cerrar Día</span>
          </button>
        )}
      </div>

      {/* Alertas */}
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* Estado actual */}
      {loading ? (
        <div className="card mb-6">
          <div className="card-body text-center text-stone-400">Cargando conciliación...</div>
        </div>
      ) : reconciliation ? (
        <>
          <div className={`mb-6 p-5 rounded-xl border ${
            reconciliation.status === 'CLOSED'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">
                  {reconciliation.status === 'CLOSED' ? 'Día Cerrado' : 'Día Abierto'}
                </h2>
                {reconciliation.closedBy && (
                  <p className="text-sm text-stone-600 mt-1">
                    Cerrado por {reconciliation.closedBy} — {formatDateTime(reconciliation.closedAt!)}
                  </p>
                )}
              </div>
              {hasDiscrepancy && (
                <span className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                  Discrepancia detectada
                </span>
              )}
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="card">
              <div className="card-body">
                <p className="text-sm font-medium text-stone-500">Total Ventas</p>
                <p className="text-lg font-bold text-stone-900 mt-1">{formatCurrency(reconciliation.totalSales)}</p>
              </div>
            </div>
            {paymentBreakdown.map((payment) => (
              <div key={payment.method} className="card">
                <div className="card-body">
                  <p className="text-sm font-medium text-stone-500">{payment.icon} {payment.method}</p>
                  <p className="text-lg font-bold text-stone-900 mt-1">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Validación */}
          <div className="card mb-6">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-stone-900 mb-4">Validación de Pagos</h3>
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Suma de pagos:</span>
                    <span className="font-medium text-stone-900">{formatCurrency(paymentsSum)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Total ventas:</span>
                    <span className="font-medium text-stone-900">{formatCurrency(reconciliation.totalSales)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-medium pt-2 border-t border-stone-200 ${
                    hasDiscrepancy ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    <span>Diferencia:</span>
                    <span>{formatCurrency(Math.abs(paymentsSum - reconciliation.totalSales))}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                  hasDiscrepancy
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {hasDiscrepancy ? '!' : '✓'}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card mb-6">
          <div className="card-body text-center py-12">
            <p className="text-stone-500">No hay conciliación registrada para hoy.</p>
            <p className="text-sm text-stone-400 mt-1">Se creará automáticamente con la primera venta.</p>
          </div>
        </div>
      )}

      {/* Formulario de cierre */}
      {showCloseForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">Cerrar Día</h2>
            <p className="text-sm text-stone-500 mt-0.5">Confirma el cierre del día y registra cualquier observación</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleCloseDay}>
              <div className="space-y-5">
                <div>
                  <label className="form-label">Cerrado por *</label>
                  <input
                    type="text"
                    value={closeData.closedBy}
                    onChange={(e) => setCloseData(prev => ({ ...prev, closedBy: e.target.value }))}
                    className="form-input"
                    placeholder="Nombre de quien cierra"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Discrepancias u Observaciones</label>
                  <textarea
                    value={closeData.discrepancies}
                    onChange={(e) => setCloseData(prev => ({ ...prev, discrepancies: e.target.value }))}
                    className="form-textarea"
                    rows={3}
                    placeholder="Notas sobre discrepancias o observaciones del día..."
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button type="submit" className="btn-primary">
                  Confirmar Cierre
                </button>
                <button type="button" onClick={() => setShowCloseForm(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="table-container">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-stone-900">Historial de Conciliaciones</h2>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No hay historial de conciliaciones.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Total Ventas</th>
                <th className="table-th">Efectivo</th>
                <th className="table-th">Transferencia</th>
                <th className="table-th">Tarjeta</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Cerrado por</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {history.map((rec) => (
                <tr key={rec.id} className="hover:bg-stone-50 transition-colors">
                  <td className="table-td font-medium text-stone-900">{formatDate(rec.date)}</td>
                  <td className="table-td font-semibold text-stone-900">
                    {formatCurrency(rec.totalSales)}
                  </td>
                  <td className="table-td">{formatCurrency(rec.cashTotal)}</td>
                  <td className="table-td">{formatCurrency(rec.transferTotal)}</td>
                  <td className="table-td">{formatCurrency(rec.cardTotal)}</td>
                  <td className="table-td">
                    <span className={rec.status === 'CLOSED' ? 'badge-active' : 'badge-nacional'}>
                      {rec.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
                    </span>
                  </td>
                  <td className="table-td">{rec.closedBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Conciliacion;
