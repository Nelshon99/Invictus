import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

interface Tray {
  id: string;
  code: string;
  name: string;
  goldType: string;
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
  status: string;
  trayType: string;
  supplierName?: string;
  supplierPhone?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseNotes?: string;
  createdAt: string;
}

interface TrayFormData {
  code: string;
  name: string;
  goldType: string;
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
  trayType: string;
  supplierName: string;
  supplierPhone: string;
  purchasePrice: number;
  purchaseDate: string;
  purchaseNotes: string;
}

const emptyForm: TrayFormData = {
  code: '',
  name: '',
  goldType: 'ITALIANO',
  trayWeightCg: 0,
  goldWeightCg: 0,
  pieceCount: 0,
  trayType: 'EXHIBIDO',
  supplierName: '',
  supplierPhone: '',
  purchasePrice: 0,
  purchaseDate: '',
  purchaseNotes: '',
};

const Bandejas: React.FC = () => {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTray, setEditingTray] = useState<Tray | null>(null);
  const [formData, setFormData] = useState<TrayFormData>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterGoldType, setFilterGoldType] = useState<string>('ALL');
  const [filterTrayType, setFilterTrayType] = useState<string>('ALL');
  const [showInactive, setShowInactive] = useState(false);

  const fetchTrays = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getTrays();
      setTrays(response.data);
    } catch (err: any) {
      setError('Error al cargar bandejas: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrays();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Campos que son strings (no convertir a número)
    const stringFields = ['code', 'name', 'goldType', 'trayType', 'supplierName', 'supplierPhone', 'purchaseDate', 'purchaseNotes'];
    // Campos numéricos
    const numericFields = ['trayWeightCg', 'goldWeightCg', 'pieceCount', 'purchasePrice'];
    setFormData(prev => ({
      ...prev,
      [name]: stringFields.includes(name) ? value : (numericFields.includes(name) ? Number(value) : value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code || !formData.name) {
      setError('El código y nombre son obligatorios');
      return;
    }

    try {
      if (editingTray) {
        await inventoryApi.updateTray(editingTray.id, formData);
        setSuccess('Bandeja actualizada exitosamente');
      } else {
        await inventoryApi.createTray(formData);
        setSuccess('Bandeja creada exitosamente');
      }
      setFormData(emptyForm);
      setEditingTray(null);
      setShowForm(false);
      fetchTrays();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al guardar la bandeja');
    }
  };

  const handleEdit = (tray: Tray) => {
    setEditingTray(tray);
    setFormData({
      code: tray.code,
      name: tray.name,
      goldType: tray.goldType,
      trayWeightCg: tray.trayWeightCg,
      goldWeightCg: tray.goldWeightCg,
      pieceCount: tray.pieceCount,
      trayType: tray.trayType || 'EXHIBIDO',
      supplierName: tray.supplierName || '',
      supplierPhone: tray.supplierPhone || '',
      purchasePrice: tray.purchasePrice || 0,
      purchaseDate: tray.purchaseDate ? tray.purchaseDate.split('T')[0] : '',
      purchaseNotes: tray.purchaseNotes || '',
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (tray: Tray) => {
    const newStatus = tray.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'INACTIVE' ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Estás seguro de ${action} esta bandeja?`)) return;
    try {
      await inventoryApi.updateTrayStatus(tray.id, newStatus);
      setSuccess(`Bandeja ${newStatus === 'INACTIVE' ? 'desactivada' : 'activada'} exitosamente`);
      fetchTrays();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || `Error al ${action} la bandeja`);
    }
  };


  const handleCancel = () => {
    setShowForm(false);
    setEditingTray(null);
    setFormData(emptyForm);
    setError('');
  };


  const filteredTrays = trays
    .filter(t => filterGoldType === 'ALL' || t.goldType === filterGoldType)
    .filter(t => filterTrayType === 'ALL' || t.trayType === filterTrayType)
    .filter(t => showInactive || t.status === 'ACTIVE');

  const cgToGrams = (cg: number) => (cg / 100).toFixed(2);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Bandejas</h1>
          <p className="text-sm text-stone-500 mt-1">Gestiona las bandejas de oro y su inventario</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingTray(null); setFormData(emptyForm); setError(''); }}
          className="btn-primary"
        >
          <span>+ Nueva Bandeja</span>
        </button>
      </div>

      {/* Alertas */}
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">
              {editingTray ? 'Editar Bandeja' : 'Nueva Bandeja'}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className="form-label">Código *</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    disabled={!!editingTray}
                    className="form-input"
                    placeholder="Ej: B001"
                  />
                </div>
                <div>
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Ej: Bandeja Italiano 1"
                  />
                </div>
                <div>
                  <label className="form-label">Tipo de Bandeja</label>
                  <select
                    name="trayType"
                    value={formData.trayType}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="EXHIBIDO">Exhibido (Producción)</option>
                    <option value="PROVEEDOR">Proveedor (Compra)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipo de Oro</label>
                  <select
                    name="goldType"
                    value={formData.goldType}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="ITALIANO">Italiano</option>
                    <option value="NACIONAL">Nacional (Colombiano)</option>
                  </select>
                </div>
                {formData.trayType === 'PROVEEDOR' && (
                  <>
                    <div>
                      <label className="form-label">Nombre del Proveedor</label>
                      <input
                        type="text"
                        name="supplierName"
                        value={formData.supplierName}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div>
                      <label className="form-label">Teléfono del Proveedor</label>
                      <input
                        type="text"
                        name="supplierPhone"
                        value={formData.supplierPhone}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    <div>
                      <label className="form-label">Precio de Compra ($)</label>
                      <input
                        type="number"
                        name="purchasePrice"
                        value={formData.purchasePrice}
                        onChange={handleInputChange}
                        className="form-input"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="form-label">Fecha de Compra</label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={formData.purchaseDate}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Notas de Compra</label>
                      <textarea
                        name="purchaseNotes"
                        value={formData.purchaseNotes}
                        onChange={handleInputChange}
                        className="form-input"
                        rows={2}
                        placeholder="Notas adicionales sobre la compra"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="form-label">Peso de la Bandeja (g)</label>
                  <input
                    type="number"
                    name="trayWeightCg"
                    value={formData.trayWeightCg / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, trayWeightCg: Number(e.target.value) * 100 }))}
                    className="form-input"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="form-label">Peso del Oro (g)</label>
                  <input
                    type="number"
                    name="goldWeightCg"
                    value={formData.goldWeightCg / 100}
                    onChange={(e) => setFormData(prev => ({ ...prev, goldWeightCg: Number(e.target.value) * 100 }))}
                    className="form-input"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="form-label">Cantidad de Piezas</label>
                  <input
                    type="number"
                    name="pieceCount"
                    value={formData.pieceCount}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button type="submit" className="btn-primary">
                  {editingTray ? 'Actualizar' : 'Crear Bandeja'}
                </button>
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="card mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-stone-600">Tipo de oro:</label>
              <select
                value={filterGoldType}
                onChange={(e) => setFilterGoldType(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <option value="ALL">Todos</option>
                <option value="ITALIANO">Italiano</option>
                <option value="NACIONAL">Nacional</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-stone-600">Tipo de bandeja:</label>
              <select
                value={filterTrayType}
                onChange={(e) => setFilterTrayType(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="ALL">Todas</option>
                <option value="EXHIBIDO">Exhibido</option>
                <option value="PROVEEDOR">Proveedor</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
              <span className="text-sm text-stone-600 whitespace-nowrap">
                Mostrar bandejas desactivadas
              </span>
            </div>
          </div>
          <span className="text-sm text-stone-400">{filteredTrays.length} bandeja{filteredTrays.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tabla de bandejas */}
      <div className="table-container">
        {loading ? (
          <div className="p-8 text-center text-stone-400">Cargando bandejas...</div>
        ) : filteredTrays.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-stone-500">No hay bandejas registradas aún.</p>
            <button
              onClick={() => { setShowForm(true); setEditingTray(null); setFormData(emptyForm); }}
              className="btn-ghost mt-3"
            >
              Crear la primera bandeja
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="table-th">Código</th>
                <th className="table-th">Nombre</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Tipo Oro</th>
                <th className="table-th">Peso Bandeja</th>
                <th className="table-th">Peso Oro</th>
                <th className="table-th">Peso Total</th>
                <th className="table-th">Piezas</th>
                <th className="table-th">Proveedor</th>
                <th className="table-th">Estado</th>
                <th className="table-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredTrays.map((tray) => (
                <tr key={tray.id} className="hover:bg-stone-50 transition-colors">
                  <td className="table-td font-medium text-stone-900">{tray.code}</td>
                  <td className="table-td">{tray.name}</td>
                  <td className="table-td">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      tray.trayType === 'PROVEEDOR'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {tray.trayType === 'PROVEEDOR' ? 'Proveedor' : 'Exhibido'}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={tray.goldType === 'ITALIANO' ? 'badge-italiano' : 'badge-nacional'}>
                      {tray.goldType === 'ITALIANO' ? 'Italiano' : 'Nacional'}
                    </span>
                  </td>
                  <td className="table-td">{cgToGrams(tray.trayWeightCg)} g</td>
                  <td className="table-td">{cgToGrams(tray.goldWeightCg)} g</td>
                  <td className="table-td font-semibold text-stone-900">{cgToGrams(tray.trayWeightCg + tray.goldWeightCg)} g</td>
                  <td className="table-td">{tray.pieceCount}</td>
                  <td className="table-td">
                    {tray.trayType === 'PROVEEDOR' && tray.supplierName ? (
                      <div>
                        <div className="text-sm text-stone-900">{tray.supplierName}</div>
                        {tray.supplierPhone && <div className="text-xs text-stone-400">{tray.supplierPhone}</div>}
                      </div>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="table-td">
                    <span className={tray.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>
                      {tray.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(tray)}
                        className="btn-ghost text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleStatus(tray)}
                        className={`text-sm font-medium hover:underline ${
                          tray.status === 'ACTIVE'
                            ? 'text-amber-600 hover:text-amber-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {tray.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
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

export default Bandejas;
