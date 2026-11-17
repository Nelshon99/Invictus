import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Inicio' },
    { path: '/bandejas', label: 'Bandejas' },
    { path: '/pesajes', label: 'Pesajes' },
    { path: '/ventas', label: 'Ventas' },
    { path: '/traslados', label: 'Traslados' },
    { path: '/cuentas', label: 'Cuentas' },
    { path: '/conciliacion', label: 'Conciliación' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-amber-600 text-xl">◆</span>
              <span className="text-lg font-bold tracking-tight text-stone-900">
                Invictus
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                    location.pathname === item.path
                      ? 'bg-amber-50 text-amber-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
