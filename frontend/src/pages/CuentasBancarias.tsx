import React, { useState, useEffect } from 'react';
import { accountingApi } from '../services/api';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

const accountTypes = [
  { value: 'CORRIENTE', label: 'Corriente' },
  { value: 'AHORROS', label: 'Ahorros' },
  { value: 'NEGOCIOS', label: 'Negocios' },
];

const CuentasBancarias: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    accountNumber: '',
    accountType: 'CORRIENTE',
    notes: '',
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountingApi.getBankAccounts(false);
      setAccounts(response.data);
    } catch (err: any) {
      setError('Error al cargar cuentas: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      notes: account.notes || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.bankName || !formData.accountNumber) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    try {
      if (editingId) {
        await accountingApi.updateBankAccount(editingId, formData);
        setSuccess('Cuenta actualizada exitosamente');
      } else {
        await accountingApi.createBankAccount(formData);
        setSuccess('Cuenta creada exitosamente');
      }
      setFormData({ name: '', bankName: '', accountNumber: '', accountType: 'CORRIENTE', notes: '' });
      setEditingId(null);
      setShowForm(false);
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al guardar la cuenta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cuenta? No se puede eliminar si tiene pagos asociados.')) {
      return;
    }
    try {
      await accountingApi.deleteBankAccount(id);
      setSuccess('Cuenta eliminada exitosamente');
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al eliminar la cuenta');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', bankName: '', accountNumber: '', accountType: 'CORRIENTE', notes: '' });
    setError('');
  };

  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('es-CO');

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'CORRIENTE':
        return 'badge bg-blue-50 text-blue-700 border border-blue-200';
      case 'AHORROS':
        return 'badge bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'NEGOCIOS':
        return 'badge bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'badge bg-stone-100 text-stone-700';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return 'badge bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return 'badge bg-stone-100 text-stone-500 border border-stone-200';
  };

  const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Cuentas Bancarias</h1>
          <p className="text-sm text-stone-500 mt-1">Gestiona las cuentas para recibir transferencias</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="btn-primary"
        >
          <span>+ Nueva Cuenta</span>
        </button>
      </div>

      {/* Alertas */}
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Total Cuentas</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{accounts.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Activas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm font-medium text-stone-500">Inactivas</p>
            <p className="text-2xl font-bold text-stone-400 mt-1">{accounts.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">
              {editingId ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="form-label">Nombre de la cuenta *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ej: Cuenta principal"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Banco *</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ej: Bancolombia"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Número de cuenta *</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ej: 123-456789-00"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Tipo de cuenta *</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    {accountTypes.map(at => (
                      <option key={at.value} value={at.value}>{at.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Notas</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={2}
                    placeholder="Observaciones sobre la cuenta..."
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button type="submit" className="btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de cuentas */}
      <div className="table-container">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-stone-900">Cuentas Registradas</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-stone-400">Cargando cuentas...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            No hay cuentas bancarias registradas. Crea una para empezar a recibir transferencias.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="table-th">Nombre</th>
                <th className="table-th">Banco</th>
                <th className="table-th">Número</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Creada</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-stone-50 transition-colors">
                  <td className="table-td font-medium text-stone-900">{account.name}</td>
                  <td className="table-td">{account.bankName}</td>
                  <td className="table-td font-mono text-sm">{account.accountNumber}</td>
                  <td className="table-td">
                    <span className={`badge ${getAccountTypeBadge(account.accountType)}`}>
                      {accountTypes.find(at => at.value === account.accountType)?.label}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${getStatusBadge(account.status)}`}>
                      {account.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="table-td text-sm text-stone-500">{formatDateTime(account.createdAt)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-sm text-amber-600 hover:text-amber-800 font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CuentasBancarias;
