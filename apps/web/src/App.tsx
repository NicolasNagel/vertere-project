import { Routes, Route, NavLink } from 'react-router-dom';
import { Activity, Building2, Stethoscope, FlaskConical, BarChart3 } from 'lucide-react';
import ClinicasPage from './pages/ClinicasPage';
import VeterinariosPage from './pages/VeterinariosPage';
import ExamesPage from './pages/ExamesPage';
import AtendimentosPage from './pages/AtendimentosPage';
import RelatoriosPage from './pages/RelatoriosPage';

const navItems = [
  { to: '/', label: 'Atendimentos', icon: Activity, end: true },
  { to: '/clinicas', label: 'Clínicas', icon: Building2 },
  { to: '/veterinarios', label: 'Veterinários', icon: Stethoscope },
  { to: '/exames', label: 'Exames', icon: FlaskConical },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 h-14">
          <span className="font-bold text-primary-700 text-lg tracking-tight">Vertere Lab</span>
          <nav className="flex gap-1 ml-6">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<AtendimentosPage />} />
          <Route path="/clinicas" element={<ClinicasPage />} />
          <Route path="/veterinarios" element={<VeterinariosPage />} />
          <Route path="/exames" element={<ExamesPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
        </Routes>
      </main>
    </div>
  );
}
