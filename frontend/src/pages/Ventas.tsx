import React, { useState, useEffect } from 'react';
import { inventoryApi, accountingApi } from '../services/api';

interface Tray {
  id: string;
  code: string;
  name: string;
  goldType: string;
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
  status: string;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
}

interface Payment {
  method: string;
  amount: number;
  bankAccountId?: string;
}

interface PaymentWithAccount extends Payment {
  bankAccount?: BankAccount | null;
}

interface SaleRecord {
  id: string;
  trayId: string;
  goldWeightCg: number;
  goldType: string;
  amount: number;
  operator: string;
  notes: string | null;
  createdAt: string;
  tray: Tray;
  payments: PaymentWithAccount[];
}

const paymentMethods = [
  { value: 'CASH', label: 'Efectivo', icon: '💵' },
  { value: 'TRANSFER', label: 'Transferencia', icon: '🏦' },
  { value: 'CARD', label: 'Tarjeta', icon: '💳' },
  { value: 'CREDIT', label: 'Crédito', icon: '📋' },
];

const Ventas: React.FC = () => {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    trayId: '',
    goldWeightCg: 0,
    amount: 0,
    operator: '',
    notes: '',
  });
  const [payments, setPayments] = useState<Payment[]>([
    { method: 'CASH', amount: 0 },
  ]);

  const fetchTrays = async () => {
    try {
      const response = await inventoryApi.getTrays();
      setTrays(response.data.filter((t: any) => t.status === 'ACTIVE'));
    } catch (err: any) {
      setError('Error al cargar bandejas: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await accountingApi.getBankAccounts();
      setBankAccounts(response.data);
    } catch (err: any) {
      console.error('Error al cargar cuentas bancarias:', err);
    }
  };

  const fetchTodaySales = async () => {
    try {
      setLoading(true);
      const response = await accountingApi.getTodaySales();
      setSales(response.data);
    } catch (err: any) {
      setError('Error al cargar ventas: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchTrays(), fetchBankAccounts(), fetchTodaySales()]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'goldWeightCg' || name === 'amount' ? Number(value) : value,
    }));
  };

  const handleTraySelect = (trayId: string) => {
    setFormData(prev => ({ ...prev, trayId }));
  };

  const handlePaymentChange = (index: number, field: keyof Payment, value: string | number) => {
    setPayments(prev => prev.map((p, i) => {
      const updated = { ...p, [field]: value };
      // Si cambia el método a no-transferencia, limpiar la cuenta bancaria
      if (field === 'method' && value !== 'TRANSFER') {
        delete updated.bankAccountId;
      }
      return i === index ? updated : p;
    }));
  };

  const addPayment = () => {
    setPayments(prev => [...prev, { method: 'CASH', amount: 0 }]);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.trayId || !formData.operator) {
      setError('Selecciona una bandeja e ingresa el operador');
      return;
    }

    if (formData.goldWeightCg <= 0 || formData.amount <= 0) {
      setError('El peso y monto deben ser mayores a 0');
      return;
    }

    if (Math.abs(totalPayments - formData.amount) > 0.01) {
      setError(`La suma de pagos (${totalPayments.toFixed(2)}) no coincide con el monto (${formData.amount.toFixed(2)})`);
      return;
    }

    const tray = trays.find(t => t.id === formData.trayId);
    if (!tray) return;

    try {
      await accountingApi.createSale({
        trayId: formData.trayId,
        goldWeightCg: Math.round(formData.goldWeightCg * 100),
        goldType: tray.goldType,
        amount: formData.amount,
        payments,
        operator: formData.operator,
        notes: formData.notes || undefined,
      });
      setSuccess('Venta registrada exitosamente');
      setFormData({ trayId: '', goldWeightCg: 0, amount: 0, operator: '', notes: '' });
      setPayments([{ method: 'CASH', amount: 0 }]);
      setShowForm(false);
      fetchTodaySales();
      fetchTrays();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al registrar la venta');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ trayId: '', goldWeightCg: 0, amount: 0, operator: '', notes: '' });
    setPayments([{ method: 'CASH', amount: 0 }]);
    setError('');
  };

  const cgToGrams = (cg: number) => (cg / 100).toFixed(2);
  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('es-CO');
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
  
  // Formatear un valor numérico a string con separador de miles para mostrar en inputs
  const formatInputCurrency = (value: number) => {
    if (value <= 0) return '';
    return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  // Extraer solo los dígitos de un string formateado para obtener el valor numérico
  const parseInputCurrency = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Ventas</h1>
          <p className="text-sm text-stone-500 mt-1">Registra las ventas de oro y los métodos de pago</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="btn-primary"
        >
          <span>+ Nueva Venta</span>
        </button>
      </div>

      {/* Alertas */}
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* Resumen del día */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Ventas Hoy</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{sales.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Total Vendido</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{formatCurrency(sales.reduce((sum, s) => sum + s.amount, 0))}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Oro Vendido</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{cgToGrams(sales.reduce((sum, s) => sum + s.goldWeightCg, 0))} g</p>
          </div>
        </div>
      </div>

      {/* Formulario de venta */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">Nueva Venta</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="form-label">Bandeja *</label>
                  <select
                    name="trayId"
                    value={formData.trayId}
                    onChange={(e) => handleTraySelect(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Seleccionar bandeja...</option>
                    {trays.map(tray => (
                      <option key={tray.id} value={tray.id}>
                        {tray.code} — {tray.name} ({tray.goldType === 'ITALIANO' ? 'Italiano' : 'Nacional'}) · {cgToGrams(tray.goldWeightCg)}g oro
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Operador *</label>
                  <input
                    type="text"
                    name="operator"
                    value={formData.operator}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Nombre de quien vende"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Peso de Oro Vendido (g) *</label>
                  <input
                    type="number"
                    name="goldWeightCg"
                    value={formData.goldWeightCg}
                    onChange={handleInputChange}
                    className="form-input"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Monto Total ($) *</label>
                  <input
                    type="text"
                    name="amount"
                    value={formatInputCurrency(formData.amount)}
                    onChange={(e) => {
                      const val = parseInputCurrency(e.target.value);
                      setFormData(prev => ({ ...prev, amount: val }));
                    }}
                    className="form-input font-mono"
                    placeholder="$0"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Notas</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={2}
                    placeholder="Observaciones sobre la venta..."
                  />
                </div>
              </div>

              {/* Métodos de pago */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <h3 className="form-label">Métodos de Pago</h3>
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-3">
                        <select
                          value={payment.method}
                          onChange={(e) => handlePaymentChange(index, 'method', e.target.value)}
                          className="form-select"
                          style={{ width: 'auto', minWidth: '180px' }}
                        >
                          {paymentMethods.map(pm => (
                            <option key={pm.value} value={pm.value}>{pm.icon} {pm.label}</option>
                          ))}
                        </select>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={formatInputCurrency(payment.amount)}
                            onChange={(e) => {
                              const val = parseInputCurrency(e.target.value);
                              handlePaymentChange(index, 'amount', val);
                            }}
                            className="form-input font-mono"
                            placeholder="$0"
                          />
                        </div>
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePayment(index)}
                            className="text-stone-400 hover:text-red-600 px-2 text-lg transition-colors"
                            title="Quitar este método de pago"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {payment.method === 'TRANSFER' && (
                        <div className="mt-2 ml-0 pl-4 border-l-2 border-amber-300">
                          <label className="text-xs font-medium text-stone-500 mb-1 block">
                            Cuenta de destino *
                          </label>
                          <select
                            value={payment.bankAccountId || ''}
                            onChange={(e) => handlePaymentChange(index, 'bankAccountId', e.target.value)}
                            className="form-select"
                            required={payment.method === 'TRANSFER'}
                          >
                            <option value="">Seleccionar cuenta bancaria...</option>
                            {bankAccounts.map(ba => (
                              <option key={ba.id} value={ba.id}>
                                {ba.name} — {ba.bankName} ({ba.accountNumber})
                              </option>
                            ))}
                          </select>
                          {bankAccounts.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              No hay cuentas bancarias registradas. Agrégalas en el módulo de Cuentas.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPayment}
                  className="btn-ghost text-sm mt-2"
                >
                  + Agregar otro método de pago
                </button>
                <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium ${
                  Math.abs(totalPayments - formData.amount) > 0.01 && formData.amount > 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : Math.abs(totalPayments - formData.amount) <= 0.01 && formData.amount > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-stone-50 text-stone-600 border border-stone-200'
                }`}>
                  Total pagado: {formatCurrency(totalPayments)}
                  {Math.abs(totalPayments - formData.amount) <= 0.01 && formData.amount > 0
                    ? ' — coincide con el monto'
                    : formData.amount > 0
                    ? ` — falta ${formatCurrency(Math.abs(totalPayments - formData.amount))}`
                    : ''
                  }
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button type="submit" className="btn-primary">
                  Registrar Venta
                </button>
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de ventas del día */}
      <div className="table-container">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-stone-900">Ventas de Hoy</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-stone-400">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No hay ventas registradas hoy.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="table-th">Hora</th>
                <th className="table-th">Bandeja</th>
                <th className="table-th">Oro</th>
                <th className="table-th">Monto</th>
                <th className="table-th">Pagos</th>
                <th className="table-th">Operador</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-stone-50 transition-colors">
                  <td className="table-td">{formatDateTime(sale.createdAt)}</td>
                  <td className="table-td font-medium text-stone-900">
                    {sale.tray?.code} — {sale.tray?.name}
                  </td>
                  <td className="table-td">
                    {cgToGrams(sale.goldWeightCg)} g
                    <span className={`ml-2 ${sale.goldType === 'ITALIANO' ? 'badge-italiano' : 'badge-nacional'}`}>
                      {sale.goldType === 'ITALIANO' ? 'Italiano' : 'Nacional'}
                    </span>
                  </td>
                  <td className="table-td font-semibold text-stone-900">
                    {formatCurrency(sale.amount)}
                  </td>
                  <td className="table-td">
                    <div className="flex flex-col gap-1">
                      {sale.payments.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="badge bg-stone-100 text-stone-700">
                            {paymentMethods.find(pm => pm.value === p.method)?.icon} {formatCurrency(p.amount)}
                          </span>
                          {p.method === 'TRANSFER' && p.bankAccount && (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              → {p.bankAccount.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="table-td">{sale.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Ventas;
