import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../services/api';

interface Tray {
  id: string;
  code: string;
  name: string;
  goldType: string;
  status: string;
  trayType: string;
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
}

interface WeighingRecord {
  id: string;
  trayId: string;
  type: string;
  totalWeightCg: number;
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
  operator: string;
  notes: string | null;
  previousGoldWeightCg: number;
  differenceCg: number;
  withinTolerance: boolean;
  createdAt: string;
  tray: Tray;
}

type TrayDayState = 'NEEDS_OPENING' | 'OPENED_NEEDS_CLOSING' | 'CLOSED';

interface TrayWeighingState {
  tray: Tray;
  dayState: TrayDayState;
  lastWeighing: WeighingRecord | null;
  form: {
    totalWeightGrams: string;
    trayWeightGrams: string;
    pieceCount: string;
    operator: string;
    notes: string;
  };
  validation: {
    loading: boolean;
    errors: string[];
    warnings: string[];
    currentTotalWeightCg?: number;
    currentGoldWeightCg?: number;
    currentTrayWeightCg?: number;
    previousTotalWeightCg?: number;
    differenceCg?: number;
    withinTolerance?: boolean;
  };
  submitting: boolean;
}

const emptyForm = {
  totalWeightGrams: '',
  trayWeightGrams: '',
  pieceCount: '',
  operator: '',
  notes: '',
};

const emptyValidation = {
  loading: false,
  errors: [] as string[],
  warnings: [] as string[],
};

const cgToGrams = (cg: number) => (cg / 100).toFixed(2);
const gramsToCg = (grams: string) => {
  const val = parseFloat(grams);
  return isNaN(val) ? 0 : Math.round(val * 100);
};
const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('es-CO');

const dayStateLabel: Record<TrayDayState, string> = {
  NEEDS_OPENING: 'Necesita apertura',
  OPENED_NEEDS_CLOSING: 'Abierta — necesita cierre',
  CLOSED: 'Cerrada',
};

const dayStateBadge: Record<TrayDayState, string> = {
  NEEDS_OPENING: 'bg-amber-100 text-amber-800 border-amber-200',
  OPENED_NEEDS_CLOSING: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const Pesajes: React.FC = () => {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [weighings, setWeighings] = useState<WeighingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [trayStates, setTrayStates] = useState<Record<string, TrayWeighingState>>({});
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [dayOperator, setDayOperator] = useState('');

  // Cargar bandejas y pesajes del día
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [traysRes, openingsRes, closingsRes] = await Promise.all([
        inventoryApi.getTrays(),
        inventoryApi.getTodayOpenings(),
        inventoryApi.getTodayClosings(),
      ]);

      const trayList = traysRes.data.filter((t: Tray) => t.status === 'ACTIVE' && t.trayType !== 'PROVEEDOR');
      setTrays(trayList);

      const allWeighings = [...openingsRes.data, ...closingsRes.data].sort(
        (a: WeighingRecord, b: WeighingRecord) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setWeighings(allWeighings);

      // Cargar estado de cada bandeja
      // Cargar operario del último pesaje del día como sugerencia
      const lastWeighingOfTheDay = allWeighings[0];
      if (lastWeighingOfTheDay) {
        setDayOperator(lastWeighingOfTheDay.operator);
      }

      const states: Record<string, TrayWeighingState> = {};
      for (const tray of trayList) {
        try {
          const stateRes = await inventoryApi.getTrayDayState(tray.id);
          const lastW = allWeighings.find(w => w.trayId === tray.id);
          states[tray.id] = {
            tray,
            dayState: stateRes.data.state,
            lastWeighing: lastW || null,
            form: { ...emptyForm, trayWeightGrams: cgToGrams(tray.trayWeightCg), pieceCount: String(tray.pieceCount) },
            validation: { ...emptyValidation },
            submitting: false,
          };
        } catch {
          states[tray.id] = {
            tray,
            dayState: 'NEEDS_OPENING',
            lastWeighing: null,
            form: { ...emptyForm, trayWeightGrams: cgToGrams(tray.trayWeightCg), pieceCount: String(tray.pieceCount) },
            validation: { ...emptyValidation },
            submitting: false,
          };
        }
      }
      setTrayStates(states);
    } catch (err: any) {
      setGlobalError('Error al cargar datos: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Validación en tiempo real con debounce
  const debouncedValidate = useCallback((trayId: string, form: typeof emptyForm, type: 'OPENING' | 'CLOSING', trayWtCg: number) => {
    const timeout = setTimeout(async () => {
      const totalCg = gramsToCg(form.totalWeightGrams);
      const pieces = parseInt(form.pieceCount) || 0;

      if (!form.totalWeightGrams && !form.trayWeightGrams) {
        setTrayStates(prev => ({
          ...prev,
          [trayId]: {
            ...prev[trayId],
            validation: { ...emptyValidation },
          },
        }));
        return;
      }

      setTrayStates(prev => ({
        ...prev,
        [trayId]: {
          ...prev[trayId],
          validation: { ...prev[trayId].validation, loading: true },
        },
      }));

      const operator = dayOperator || form.operator || 'temp';
      try {
        const res = await inventoryApi.validateWeighing({
          trayId,
          type,
          totalWeightCg: totalCg,
          trayWeightCg: trayWtCg,
          pieceCount: pieces,
          operator,
        });
        const v = res.data;
        setTrayStates(prev => ({
          ...prev,
          [trayId]: {
            ...prev[trayId],
            validation: {
              loading: false,
              errors: v.errors || [],
              warnings: v.warnings || [],
              currentTotalWeightCg: v.info?.currentTotalWeightCg,
              currentGoldWeightCg: v.info?.currentGoldWeightCg,
              currentTrayWeightCg: v.info?.currentTrayWeightCg,
              previousTotalWeightCg: v.info?.previousTotalWeightCg,
              differenceCg: v.info?.differenceCg,
              withinTolerance: v.info?.withinTolerance,
            },
          },
        }));
      } catch {
        setTrayStates(prev => ({
          ...prev,
          [trayId]: {
            ...prev[trayId],
            validation: { ...emptyValidation, loading: false },
          },
        }));
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  const handleFormChange = (trayId: string, field: string, value: string, type: 'OPENING' | 'CLOSING') => {
    setTrayStates(prev => {
      const state = prev[trayId];
      const newForm = { ...state.form, [field]: value };
      const newState = { ...state, form: newForm };
      // Trigger debounced validation with trayWeightCg from the current state
      debouncedValidate(trayId, newForm, type, state.tray.trayWeightCg);
      return { ...prev, [trayId]: newState };
    });
  };

  const handleSubmitWeighing = async (trayId: string, type: 'OPENING' | 'CLOSING') => {
    const state = trayStates[trayId];
    if (!state) return;

    const { form } = state;
    const operator = dayOperator || form.operator;
    if (!operator.trim()) {
      setGlobalError('Ingresa el nombre del Operario del Día');
      return;
    }
    if (!form.totalWeightGrams || parseFloat(form.totalWeightGrams) <= 0) {
      setTrayStates(prev => ({
        ...prev,
        [trayId]: {
          ...prev[trayId],
          validation: { ...prev[trayId].validation, errors: ['Ingresa el peso total en la balanza'] },
        },
      }));
      return;
    }

    setTrayStates(prev => ({
      ...prev,
      [trayId]: { ...prev[trayId], submitting: true },
    }));

    try {
      await inventoryApi.createWeighing({
        trayId,
        type,
        totalWeightCg: gramsToCg(form.totalWeightGrams),
        trayWeightCg: state.tray.trayWeightCg,
        pieceCount: parseInt(form.pieceCount) || 0,
        operator: operator.trim(),
        notes: form.notes.trim() || undefined,
      });

      setGlobalSuccess(`Pesaje de ${type === 'OPENING' ? 'apertura' : 'cierre'} registrado para ${state.tray.code}`);
      setGlobalError('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Error al registrar el pesaje';
      setTrayStates(prev => ({
        ...prev,
        [trayId]: {
          ...prev[trayId],
          validation: { ...prev[trayId].validation, errors: [msg] },
          submitting: false,
        },
      }));
    }
  };

  // Peso del oro: valor fijo desde la bandeja (solo cambia con ventas, traslados, o adición de piezas)
  const trayGoldWeightGrams = (trayId: string) => {
    const state = trayStates[trayId];
    if (!state) return '';
    return cgToGrams(state.tray.goldWeightCg);
  };

  // Peso calculado en balanza: peso total - bandeja vacía (incluye efecto humedad)
  const calculatedGoldWeightGrams = (trayId: string) => {
    const state = trayStates[trayId];
    if (!state) return '';
    const total = parseFloat(state.form.totalWeightGrams) || 0;
    const trayWt = state.tray.trayWeightCg / 100;
    return (total - trayWt).toFixed(2);
  };

  // Humedad: diferencia del peso del ORO entre el pesaje actual y el anterior
  // Ej: apertura 600g oro → cierre 596g oro = -0.4g | siguiente apertura 597g → cierre anterior 596g = +1g
  const humidityDifference = (trayId: string) => {
    const state = trayStates[trayId];
    if (!state) return null;
    const currentTotalCg = gramsToCg(state.form.totalWeightGrams);
    if (currentTotalCg <= 0) return null;

    // Peso del oro actual (peso total - bandeja vacía)
    const currentGoldCg = currentTotalCg - state.tray.trayWeightCg;
    if (currentGoldCg <= 0) return null;

    // Buscar el último pesaje registrado de esta bandeja para comparar el peso del oro
    const lastW = state.lastWeighing;
    if (!lastW || lastW.goldWeightCg <= 0) return null;

    // lastW.goldWeightCg ya es el peso del oro del último pesaje (total - bandeja)
    const diffCg = currentGoldCg - lastW.goldWeightCg;

    // Si la diferencia es mayor a 100g, es un error de datos (ej: bandeja con goldWeightCg=0)
    // No mostrar valores absurdos
    if (Math.abs(diffCg) > 10000) return null;

    return (diffCg / 100).toFixed(2);
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Pesajes</h1>
        <p className="text-sm text-stone-500 mt-1">
          Registra el peso de cada bandeja. El orden debe ser: apertura → cierre → apertura del día siguiente.
        </p>
      </div>

      {/* Alertas globales */}
      {globalError && <div className="alert-error mb-4">{globalError}</div>}
      {globalSuccess && <div className="alert-success mb-4">{globalSuccess}</div>}

      {/* Operario del día */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="form-label">Operario del Día</label>
              <input
                type="text"
                value={dayOperator}
                onChange={(e) => setDayOperator(e.target.value)}
                className="form-input"
                placeholder="Nombre de quien realiza los pesajes hoy"
              />
            </div>
            {dayOperator && (
              <div className="text-sm text-stone-500 whitespace-nowrap">
                Todos los pesajes de hoy usarán: <strong className="text-stone-800">{dayOperator}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="card">
          <div className="card-body">
            <p className="text-xs font-medium text-stone-500">Bandejas</p>
            <p className="text-2xl font-bold text-stone-900">{trays.length}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs font-medium text-stone-500">Aperturas</p>
            <p className="text-2xl font-bold text-emerald-700">
              {weighings.filter(w => w.type === 'OPENING').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs font-medium text-stone-500">Cierres</p>
            <p className="text-2xl font-bold text-rose-700">
              {weighings.filter(w => w.type === 'CLOSING').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs font-medium text-stone-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-700">
              {Object.values(trayStates).filter(s => s.dayState === 'OPENED_NEEDS_CLOSING').length}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-stone-400">Cargando bandejas...</div>
      ) : trays.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-stone-500">No hay bandejas registradas. Crea bandejas primero.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(trayStates).map((state) => {
            const { tray, dayState, form, validation, submitting, lastWeighing } = state;
            const canOpen = dayState === 'NEEDS_OPENING' || dayState === 'CLOSED';
            const canClose = dayState === 'OPENED_NEEDS_CLOSING';
            const activeType: 'OPENING' | 'CLOSING' = canClose ? 'CLOSING' : 'OPENING';
            const goldWeight = trayGoldWeightGrams(tray.id);
            const calcWeight = calculatedGoldWeightGrams(tray.id);

            return (
              <div key={tray.id} className="card">
                {/* Header de bandeja */}
                <div className="card-header flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      dayState === 'NEEDS_OPENING' ? 'bg-amber-400' :
                      dayState === 'OPENED_NEEDS_CLOSING' ? 'bg-emerald-400' :
                      'bg-stone-300'
                    }`} />
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">
                        {tray.code} — {tray.name}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {tray.goldType === 'ITALIANO' ? 'Oro Italiano' : 'Oro Nacional'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${dayStateBadge[dayState]}`}>
                    {dayStateLabel[dayState]}
                  </span>
                </div>

                {/* Info del último pesaje */}
                {lastWeighing && (
                  <div className="px-6 pt-2 pb-3">
                    <div className="flex flex-wrap gap-4 text-xs text-stone-500 bg-stone-50 rounded-lg p-3">
                      <span>
                        Último: <strong className="text-stone-700">
                          {lastWeighing.type === 'OPENING' ? 'Apertura' : 'Cierre'}
                        </strong>
                      </span>
                      <span>
                        Oro: <strong className="text-stone-700">{cgToGrams(lastWeighing.goldWeightCg)} g</strong>
                      </span>
                      <span>
                        Piezas: <strong className="text-stone-700">{lastWeighing.pieceCount}</strong>
                      </span>
                      <span>
                        {formatDateTime(lastWeighing.createdAt)}
                      </span>
                      {lastWeighing.differenceCg !== 0 && (
                        <span className={lastWeighing.withinTolerance ? 'text-emerald-600' : 'text-rose-600'}>
                          Dif peso total: <strong>{cgToGrams(Math.abs(lastWeighing.differenceCg))} g</strong>
                          {lastWeighing.withinTolerance ? ' ✓' : ' ⚠ Fuera de tolerancia'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Formulario inline */}
                {(canOpen || canClose) && (
                  <div className="px-6 pb-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                      <div>
                        <label className="form-label text-xs">Peso Total en Balanza (g) *</label>
                        <input
                          type="number"
                          value={form.totalWeightGrams}
                          onChange={(e) => handleFormChange(tray.id, 'totalWeightGrams', e.target.value, activeType)}
                          className="form-input text-sm"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="form-label text-xs">Peso Bandeja Vacía (g) — Fijo</label>
                        <input
                          type="text"
                          value={cgToGrams(tray.trayWeightCg)}
                          className="form-input text-sm bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="form-label text-xs">Cantidad de Piezas</label>
                        <input
                          type="number"
                          value={form.pieceCount}
                          onChange={(e) => handleFormChange(tray.id, 'pieceCount', e.target.value, activeType)}
                          className="form-input text-sm"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="form-label text-xs">Peso del Oro en Bandeja (g) — Fijo</label>
                        <input
                          type="text"
                          value={goldWeight}
                          className={`form-input text-sm font-semibold ${
                            parseFloat(goldWeight) > 0 ? 'text-amber-700' : 'text-stone-400'
                          } bg-stone-50 border-stone-200`}
                          readOnly
                        />
                        <p className="text-[10px] text-stone-400 mt-1">
                          Solo cambia con ventas, traslados o adición de piezas.
                        </p>
                      </div>
                      <div>
                        <label className="form-label text-xs">Peso calculado en balanza (g)</label>
                        <input
                          type="text"
                          value={calcWeight}
                          className="form-input text-sm text-stone-600 bg-stone-50 border-stone-200"
                          readOnly
                        />
                        <p className="text-[10px] text-stone-400 mt-1">
                          Peso total menos bandeja vacía (incluye humedad).
                        </p>
                      </div>
                      <div>
                        <label className="form-label text-xs">Diferencia oro vs último pesaje (g)</label>
                        {(() => {
                          const hum = humidityDifference(tray.id);
                          if (hum === null) {
                            return (
                              <input
                                type="text"
                                value="—"
                                className="form-input text-sm bg-stone-50 border-stone-200 text-stone-400 cursor-not-allowed"
                                readOnly
                              />
                            );
                          }
                          const humVal = parseFloat(hum);
                          const isPositive = humVal >= 0;
                          return (
                            <input
                              type="text"
                              value={`${isPositive ? '+' : ''}${hum} g`}
                              className={`form-input text-sm font-semibold cursor-not-allowed ${
                                Math.abs(humVal) <= 0.50
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200'
                              }`}
                              readOnly
                            />
                          );
                        })()}
                      </div>
                      <div>
                        <label className="form-label text-xs">Notas</label>
                        <input
                          type="text"
                          value={form.notes}
                          onChange={(e) => handleFormChange(tray.id, 'notes', e.target.value, activeType)}
                          className="form-input text-sm"
                          placeholder="Observaciones..."
                        />
                      </div>
                    </div>

                    {/* Validaciones en tiempo real */}
                    {validation.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        {validation.errors.map((err, i) => (
                          <p key={i} className="text-sm text-rose-700">⛔ {err}</p>
                        ))}
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        {validation.warnings.map((warn, i) => (
                          <p key={i} className="text-sm text-amber-700">⚠️ {warn}</p>
                        ))}
                      </div>
                    )}

                    {/* Comparación peso total en balanza vs bandeja */}
                    {validation.currentTotalWeightCg !== undefined && validation.currentTotalWeightCg > 0 && (
                      <div className={`mt-2 p-3 rounded-lg border ${
                        validation.withinTolerance
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-rose-50 border-rose-200'
                      }`}>
                        <p className="text-sm">
                          <strong>Peso total registrado en bandeja:</strong> {cgToGrams(validation.currentTotalWeightCg)} g
                          {' '}({cgToGrams(validation.currentGoldWeightCg!)} g oro + {cgToGrams(validation.currentTrayWeightCg!)} g bandeja vacía)
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Peso total en balanza:</strong> {parseFloat(state.form.totalWeightGrams || '0').toFixed(2)} g
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Diferencia:</strong>
                          {' '}{validation.differenceCg! >= 0 ? '+' : ''}{cgToGrams(validation.differenceCg!)} g
                          {validation.withinTolerance
                            ? ' ✓ Dentro del margen de ±0.50 g'
                            : ' ⚠ Fuera del margen de ±0.50 g'}
                        </p>
                      </div>
                    )}

                    {/* Botón de acción */}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => handleSubmitWeighing(tray.id, activeType)}
                        disabled={submitting || validation.errors.length > 0}
                        className={`btn-primary text-sm ${
                          activeType === 'OPENING'
                            ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                            : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {submitting ? 'Registrando...' :
                         activeType === 'OPENING' ? 'Registrar Apertura' : 'Registrar Cierre'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Bandeja cerrada - sin formulario */}
                {dayState === 'CLOSED' && canClose === false && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-stone-400 italic">
                      Cierre registrado. La apertura del próximo día estará disponible después del cierre.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Historial de pesajes del día */}
      {weighings.length > 0 && (
        <div className="mt-8 table-container">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">Historial de Hoy</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="table-header">
              <tr>
                <th className="table-th">Hora</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Bandeja</th>
                <th className="table-th">Peso Total</th>
                <th className="table-th">Peso Oro</th>
                <th className="table-th">Piezas</th>
                <th className="table-th">Diferencia peso total</th>
                <th className="table-th">Operador</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {weighings.map((w) => (
                <tr key={w.id} className="hover:bg-stone-50 transition-colors">
                  <td className="table-td text-sm">{formatDateTime(w.createdAt)}</td>
                  <td className="table-td">
                    <span className={w.type === 'OPENING' ? 'badge-opening' : 'badge-closing'}>
                      {w.type === 'OPENING' ? 'Apertura' : 'Cierre'}
                    </span>
                  </td>
                  <td className="table-td font-medium text-stone-900 text-sm">
                    {w.tray?.code} — {w.tray?.name}
                  </td>
                  <td className="table-td text-sm">{cgToGrams(w.totalWeightCg)} g</td>
                  <td className="table-td text-sm font-medium">{cgToGrams(w.goldWeightCg)} g</td>
                  <td className="table-td text-sm">{w.pieceCount}</td>
                  <td className="table-td text-sm">
                    {w.differenceCg !== 0 ? (
                      <span className={w.withinTolerance ? 'text-emerald-600' : 'text-rose-600 font-medium'}>
                        {w.differenceCg > 0 ? '+' : ''}{cgToGrams(w.differenceCg)} g
                        {w.withinTolerance ? ' ✓' : ' ⚠'}
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="table-td text-sm">{w.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Pesajes;
