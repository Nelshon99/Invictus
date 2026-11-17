import React, { useState, useEffect } from 'react';
import { inventoryApi, accountingApi } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    traysCount: 0,
    weighingsCount: 0,
    salesCount: 0,
    totalSales: 0,
    totalGoldSold: 0,
    reconciliationStatus: 'N/A',
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [traysRes, openingsRes, closingsRes, salesRes, reconRes] = await Promise.allSettled([
        inventoryApi.getTrays(),
        inventoryApi.getTodayOpenings(),
        inventoryApi.getTodayClosings(),
        accountingApi.getTodaySales(),
        accountingApi.getTodayReconciliation(),
      ]);

      const traysCount = traysRes.status === 'fulfilled' ? traysRes.value.data.length : 0;
      const openings = openingsRes.status === 'fulfilled' ? openingsRes.value.data.length : 0;
      const closings = closingsRes.status === 'fulfilled' ? closingsRes.value.data.length : 0;
      const sales = salesRes.status === 'fulfilled' ? salesRes.value.data : [];
      const recon = reconRes.status === 'fulfilled' ? reconRes.value.data : null;

      setStats({
        traysCount,
        weighingsCount: openings + closings,
        salesCount: sales.length,
        totalSales: sales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalGoldSold: sales.reduce((sum: number, s: any) => sum + s.goldWeightCg, 0),
        reconciliationStatus: recon?.status || 'N/A',
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
  const cgToGrams = (cg: number) => (cg / 100).toFixed(2);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Inicio</h1>
          <p className="text-sm text-stone-500 mt-1">Resumen general del día</p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-ghost text-sm"
        >
          Actualizar
        </button>
      </div>

      {loading && (
        <div className="mb-4 text-sm text-stone-400">Cargando datos...</div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg">
              ◆
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Bandejas Activas</p>
              <p className="text-2xl font-bold text-stone-900">{stats.traysCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-lg">
              ⚖
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Pesajes Hoy</p>
              <p className="text-2xl font-bold text-stone-900">{stats.weighingsCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
              $
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Ventas Hoy</p>
              <p className="text-2xl font-bold text-stone-900">{formatCurrency(stats.totalSales)}</p>
              <p className="text-xs text-stone-400">{stats.salesCount} transacciones</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              stats.reconciliationStatus === 'CLOSED'
                ? 'bg-emerald-100 text-emerald-700'
                : stats.reconciliationStatus === 'OPEN'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-100 text-stone-500'
            }`}>
              {stats.reconciliationStatus === 'CLOSED' ? '✓' : stats.reconciliationStatus === 'OPEN' ? '◷' : '—'}
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Conciliación</p>
              <p className={`text-lg font-bold ${
                stats.reconciliationStatus === 'CLOSED'
                  ? 'text-emerald-700'
                  : stats.reconciliationStatus === 'OPEN'
                  ? 'text-amber-700'
                  : 'text-stone-500'
              }`}>
                {stats.reconciliationStatus === 'CLOSED' ? 'Cerrada'
                  : stats.reconciliationStatus === 'OPEN' ? 'Abierta'
                  : 'Sin datos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen y acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">Resumen del Día</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Oro vendido</span>
                <span className="text-sm font-medium text-stone-900">{cgToGrams(stats.totalGoldSold)} g</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Ventas realizadas</span>
                <span className="text-sm font-medium text-stone-900">{stats.salesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Total recaudado</span>
                <span className="text-sm font-medium text-stone-900">{formatCurrency(stats.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-500">Bandejas activas</span>
                <span className="text-sm font-medium text-stone-900">{stats.traysCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-stone-900">Ir a</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              <a href="/bandejas" className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-800 font-medium text-sm transition-colors">
                <span className="w-8 h-8 rounded-md bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center text-sm transition-colors">◆</span>
                Bandejas
              </a>
              <a href="/pesajes" className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-stone-50 hover:bg-sky-50 text-stone-700 hover:text-sky-800 font-medium text-sm transition-colors">
                <span className="w-8 h-8 rounded-md bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center text-sm transition-colors">⚖</span>
                Pesajes
              </a>
              <a href="/ventas" className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-stone-50 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 font-medium text-sm transition-colors">
                <span className="w-8 h-8 rounded-md bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-sm transition-colors">$</span>
                Ventas
              </a>
              <a href="/conciliacion" className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-stone-50 hover:bg-purple-50 text-stone-700 hover:text-purple-800 font-medium text-sm transition-colors">
                <span className="w-8 h-8 rounded-md bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-sm transition-colors">☰</span>
                Conciliación
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
