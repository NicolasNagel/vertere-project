import { Routes, Route, NavLink } from 'react-router-dom';
import { Activity, Building2, Stethoscope, FlaskConical, BarChart3, FlaskRound } from 'lucide-react';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './context/ToastContext';
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
  const { toasts, dismiss } = useToast();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <FlaskRound size={16} className="text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm">Vertere Lab</span>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Gestão Laboratorial</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-brand-50 text-brand-700'
                   : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-brand-600' : 'text-slate-400'} aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">v1.0 · Abril 2026</p>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
          <FlaskRound size={14} className="text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm">Vertere Lab</span>
        <nav className="flex gap-1 ml-auto" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                 ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'}`
              }
              aria-label={label}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14" id="main-content">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<AtendimentosPage />} />
            <Route path="/clinicas" element={<ClinicasPage />} />
            <Route path="/veterinarios" element={<VeterinariosPage />} />
            <Route path="/exames" element={<ExamesPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
          </Routes>
        </div>
      </main>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
