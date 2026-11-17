import React, { useState, useEffect } from 'react';
import { inventoryApi, transfersApi } from '../services/api';

interface Tray {
  id: string;
  code: string;
  name: string;
  goldType: string;
  pieceCount: number;
  goldWeightCg: number;
  status: string;
}

interface TransferRecord {
  id: string;
  code: string;
  sourceTrayId: string;
  destinationTrayId: string;
  pieces: number;
  gramsCg: number;
  goldType: string;
  operator: string;
  notes: string | null;
  createdAt: string;
  sourceTray: {
    code: string;
    name: string;
    goldType: string;
  };
  destinationTray: {
    code: string;
    name: string;
    goldType: string;
  };
}

const Traslados: React.FC = () => {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterGoldType, setFilterGoldType] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    sourceTrayId: '',
    destinationTrayId: '',
    pieces: 0,
    gramsCg: 0,
    operator: '',
    notes: '',
  });

  const fetchTrays = async () => {
    try {
      const response = await inventoryApi.getTrays();
      setTrays(response.data);
    } catch (err: any) {
      setError('Error al cargar bandejas: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const fetchTodayTransfers = async () => {
    try {
      setLoading(true);
      const response = await transfersApi.getTodayTransfers();
      setTransfers(response.data);
    } catch (err: any) {
      setError('Error al cargar traslados: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchTrays(), fetchTodayTransfers()]);
  }, []);

  // Filtrar bandejas activas por tipo de oro
  const activeTrays = trays.filter(t => t.status === 'ACTIVE');
  const filteredTrays = filterGoldType === 'ALL'
    ? activeTrays
    : activeTrays.filter(t => t.goldType === filterGoldType);

  // Cuando se selecciona la bandeja origen, filtrar las bandejas destino por ley
  const sourceTray = trays.find(t => t.id === formData.sourceTrayId);
  const availableDestinations = sourceTray
    ? activeTrays.filter(t => t.id !== formData.sourceTrayId && t.goldType === sourceTray.goldType)
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'pieces' || name === 'gramsCg' ? Number(value) : value,
    }));
  };

  const handleSourceTrayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      sourceTrayId: e.target.value,
      destinationTrayId: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.sourceTrayId || !formData.destinationTrayId) {
      setError('Selecciona la bandeja origen y destino');
      return;
    }
    if (formData.pieces <= 0) {
      setError('La cantidad de piezas debe ser mayor a 0');
      return;
    }
    if (!formData.operator.trim()) {
      setError('Ingresa el nombre del operario');
      return;
    }

    try {
      await transfersApi.createTransfer({
        sourceTrayId: formData.sourceTrayId,
        destinationTrayId: formData.destinationTrayId,
        pieces: formData.pieces,
        gramsCg: Math.round(formData.gramsCg * 100),
        operator: formData.operator.trim(),
        notes: formData.notes.trim() || undefined,
      });
      setSuccess('Traslado registrado exitosamente');
      setShowForm(false);
      setFormData({
        sourceTrayId: '',
        destinationTrayId: '',
        pieces: 0,
        gramsCg: 0,
        operator: '',
        notes: '',
      });
      await Promise.all([fetchTrays(), fetchTodayTransfers()]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error al registrar el traslado');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      sourceTrayId: '',
      destinationTrayId: '',
      pieces: 0,
      gramsCg: 0,
      operator: '',
      notes: '',
    });
    setError('');
  };

  const cgToGrams = (cg: number) => (cg / 100).toFixed(2);

  const filteredTransfers = filterGoldType === 'ALL'
    ? transfers
    : transfers.filter(t => t.goldType === filterGoldType);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Traslados</h1>
          <p className="text-stone-500 mt-1">Transferir piezas entre bandejas de la misma ley</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Nuevo Traslado
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 mb-6">
          {success}
        </div>
      )}

      {/* Formulario de traslado */}
      {showForm && (
        <div className="card mb-6">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-lg font-semibold text-stone-900">Registrar Traslado</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bandeja Origen */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Bandeja Origen *
                </label>
                <select
                  name="sourceTrayId"
                  value={formData.sourceTrayId}
                  onChange={handleSourceTrayChange}
                  className="form-select w-full"
                  required
                >
                  <option value="">Seleccionar bandeja origen...</option>
                  {filteredTrays.map(tray => (
                    <option key={tray.id} value={tray.id}>
                      {tray.code} - {tray.name} ({tray.goldType}) - {tray.pieceCount} pz / {cgToGrams(tray.goldWeightCg)}g
                    </option>
                  ))}
                </select>
              </div>

              {/* Bandeja Destino */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Bandeja Destino *
                </label>
                <select
                  name="destinationTrayId"
                  value={formData.destinationTrayId}
                  onChange={handleInputChange}
                  className="form-select w-full"
                  required
                  disabled={!formData.sourceTrayId}
                >
                  <option value="">
                    {formData.sourceTrayId ? 'Seleccionar bandeja destino...' : 'Selecciona origen primero'}
                  </option>
                  {availableDestinations.map(tray => (
                    <option key={tray.id} value={tray.id}>
                      {tray.code} - {tray.name} ({tray.goldType}) - {tray.pieceCount} pz / {cgToGrams(tray.goldWeightCg)}g
                    </option>
                  ))}
                </select>
                {formData.sourceTrayId && availableDestinations.length === 0 && (
                  <p className="text-amber-600 text-xs mt-1">
                    No hay otras bandejas activas con la ley {sourceTray?.goldType}
                  </p>
                )}
              </div>

              {/* Piezas */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Cantidad de Piezas *
                </label>
                <input
                  type="number"
                  name="pieces"
                  value={formData.pieces || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  min="1"
                  step="1"
                  placeholder="Ej: 5"
                  required
                />
                {sourceTray && (
                  <p className="text-stone-400 text-xs mt-1">
                    Disponible: {sourceTray.pieceCount} pieza(s)
                  </p>
                )}
              </div>

              {/* Gramos */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Gramos de Oro
                </label>
                <input
                  type="number"
                  name="gramsCg"
                  value={formData.gramsCg || ''}
                  onChange={handleInputChange}
                  className="form-input"
                  step="0.01"
                  placeholder="Ej: 10.5"
                />
                <p className="text-stone-400 text-xs mt-1">
                  Puede quedar en negativo. Se guarda en centigramos.
                </p>
              </div>

              {/* Operario */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Operario *
                </label>
                <input
                  type="text"
                  name="operator"
                  value={formData.operator}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Nombre del operario"
                  required
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notas
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Observaciones opcionales"
                />
              </div>
            </div>

            {/* Resumen del traslado */}
            {formData.sourceTrayId && formData.destinationTrayId && formData.pieces > 0 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Resumen del Traslado</h3>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>
                    De: <strong>{sourceTray?.code} - {sourceTray?.name}</strong>
                    {' '}→{' '}
                    A: <strong>{trays.find(t => t.id === formData.destinationTrayId)?.code} - {trays.find(t => t.id === formData.destinationTrayId)?.name}</strong>
                  </p>
                  <p>Piezas: {formData.pieces} pieza(s)</p>
                  {formData.gramsCg !== 0 && (
                    <p>Gramos: {formData.gramsCg}g</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Registrar Traslado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro */}
      <div className="card mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-stone-600">Filtrar por tipo de oro:</label>
            <select
              value={filterGoldType}
              onChange={(e) => setFilterGoldType(e.target.value)}
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="ALL">Todos los tipos</option>
              <option value="ITALIANO">Italiano</option>
              <option value="NACIONAL">Nacional</option>
            </select>
          </div>
          <span className="text-sm text-stone-400">{filteredTransfers.length} traslado{filteredTransfers.length !== 1 ? 's' : ''} hoy</span>
        </div>
      </div>

      {/* Tabla de traslados */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-stone-400">Cargando traslados...</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <p className="text-lg">No hay traslados registrados hoy</p>
            <p className="text-sm mt-1">Registra un nuevo traslado para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Código</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Origen</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Destino</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Piezas</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Gramos</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ley</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Operario</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-amber-700">{transfer.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-stone-900">{transfer.sourceTray.name}</div>
                      <div className="text-xs text-stone-400">{transfer.sourceTray.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-stone-900">{transfer.destinationTray.name}</div>
                      <div className="text-xs text-stone-400">{transfer.destinationTray.code}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-stone-900">{transfer.pieces}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-medium ${transfer.gramsCg < 0 ? 'text-red-600' : 'text-stone-900'}`}>
                        {cgToGrams(transfer.gramsCg)}g
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        transfer.goldType === 'ITALIANO'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {transfer.goldType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">{transfer.operator}</td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {new Date(transfer.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Traslados;
