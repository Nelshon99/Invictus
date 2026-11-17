import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bandejas from './pages/Bandejas';
import Pesajes from './pages/Pesajes';
import Ventas from './pages/Ventas';
import Traslados from './pages/Traslados';
import Conciliacion from './pages/Conciliacion';
import CuentasBancarias from './pages/CuentasBancarias';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bandejas" element={<Bandejas />} />
            <Route path="/pesajes" element={<Pesajes />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/traslados" element={<Traslados />} />
            <Route path="/cuentas" element={<CuentasBancarias />} />
            <Route path="/conciliacion" element={<Conciliacion />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
