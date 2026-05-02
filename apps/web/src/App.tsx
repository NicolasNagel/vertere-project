import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  Activity, Building2, Stethoscope, FlaskConical,
  BarChart3, Users, LogOut, ChevronDown, ChevronRight,
  TrendingUp, FileSpreadsheet,
} from 'lucide-react';
import { ToastContainer } from './components/ui/Toast';
import { useToast } from './context/ToastContext';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ClinicasPage from './pages/ClinicasPage';
import VeterinariosPage from './pages/VeterinariosPage';
import ExamesPage from './pages/ExamesPage';
import AtendimentosPage from './pages/AtendimentosPage';
import RelatoriosAnaliticoPage from './pages/RelatoriosAnaliticoPage';
import RelatoriosFechamentoPage from './pages/RelatoriosFechamentoPage';
import UsuariosPage from './pages/UsuariosPage';
import LaudoPage from './pages/LaudoPage';
import LoginPage from './pages/LoginPage';

const PAPEL_LABEL: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  funcionario: 'Funcionário',
};

export default function App() {
  const { toasts, dismiss } = useToast();
  const { user, logout, loading: authLoading } = useAuth();

  const adminRoles = ['superadmin', 'admin'] as const;

  const location = useLocation();
  const isRelatoriosActive = location.pathname.startsWith('/relatorios');
  const [relatoriosOpen, setRelatoriosOpen] = useState(isRelatoriosActive);

  useEffect(() => {
    if (isRelatoriosActive) setRelatoriosOpen(true);
  }, [isRelatoriosActive]);

  const showRelatorios = user && adminRoles.includes(user.papel as never);

  const navItems = [
    { to: '/', label: 'Atendimentos', icon: Activity, end: true, roles: null },
    { to: '/clinicas', label: 'Clínicas', icon: Building2, end: false, roles: adminRoles },
    { to: '/veterinarios', label: 'Veterinários', icon: Stethoscope, end: false, roles: adminRoles },
    { to: '/exames', label: 'Exames', icon: FlaskConical, end: false, roles: adminRoles },
    { to: '/usuarios', label: 'Usuários', icon: Users, end: false, roles: ['superadmin'] as const },
  ].filter(
    (item) => !item.roles || (user && item.roles.includes(user.papel as never)),
  );

  if (authLoading) return null;

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0">
        <div className="flex items-center justify-center px-5 h-20 border-b border-slate-100 bg-brand-600">
          <img
            src="/vertere-logo.jpeg"
            alt="Vertere Laboratório Veterinário"
            className="h-14 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Navegação principal">
          {navItems.filter((i) => i.to !== '/usuarios').map(({ to, label, icon: Icon, end }) => (
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

          {/* Relatórios — grupo colapsável */}
          {showRelatorios && (
            <div>
              <button
                onClick={() => setRelatoriosOpen((prev) => !prev)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isRelatoriosActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                aria-expanded={relatoriosOpen}
              >
                <BarChart3
                  size={16}
                  className={isRelatoriosActive ? 'text-brand-600' : 'text-slate-400'}
                  aria-hidden="true"
                />
                <span className="flex-1 text-left">Relatórios</span>
                {relatoriosOpen
                  ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
                  : <ChevronRight size={14} className="text-slate-400 shrink-0" />
                }
              </button>

              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: relatoriosOpen ? '120px' : '0px' }}
              >
                <div className="pt-0.5 space-y-0.5">
                  <NavLink
                    to="/relatorios/analitico"
                    className={({ isActive }) =>
                      `flex items-center gap-2 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                       ${isActive
                         ? 'bg-brand-50 text-brand-700'
                         : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <TrendingUp size={14} className={isActive ? 'text-brand-600' : 'text-slate-400'} aria-hidden="true" />
                        Analítico
                      </>
                    )}
                  </NavLink>

                  <NavLink
                    to="/relatorios/fechamento"
                    className={({ isActive }) =>
                      `flex items-center gap-2 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                       ${isActive
                         ? 'bg-brand-50 text-brand-700'
                         : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FileSpreadsheet size={14} className={isActive ? 'text-brand-600' : 'text-slate-400'} aria-hidden="true" />
                        Fechamento
                      </>
                    )}
                  </NavLink>
                </div>
              </div>
            </div>
          )}

          {navItems.filter((i) => i.to === '/usuarios').map(({ to, label, icon: Icon, end }) => (
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

        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-700 truncate">{user.nome}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{PAPEL_LABEL[user.papel] ?? user.papel}</p>
          </div>
          <button
            onClick={logout}
            className="btn btn-secondary w-full text-xs gap-1.5"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-600 border-b border-brand-700 px-4 h-14 flex items-center gap-3">
        <img
          src="/vertere-logo.jpeg"
          alt="Vertere Laboratório Veterinário"
          className="h-9 w-auto object-contain"
        />
        <nav className="flex gap-1 ml-auto" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                 ${isActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'}`
              }
              aria-label={label}
            >
              <Icon size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          {showRelatorios && (
            <NavLink
              to="/relatorios/analitico"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isRelatoriosActive ? 'bg-brand-700 text-white' : 'text-brand-100 hover:bg-brand-700 hover:text-white'}`}
              aria-label="Relatórios"
            >
              <BarChart3 size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Relatórios</span>
            </NavLink>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-100 hover:bg-brand-700 hover:text-white transition-colors"
            title="Sair"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </nav>
      </div>

      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14" id="main-content">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<ProtectedRoute><AtendimentosPage /></ProtectedRoute>} />
            <Route
              path="/clinicas"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><ClinicasPage /></ProtectedRoute>}
            />
            <Route
              path="/veterinarios"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><VeterinariosPage /></ProtectedRoute>}
            />
            <Route
              path="/exames"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><ExamesPage /></ProtectedRoute>}
            />
            <Route
              path="/relatorios"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><Navigate to="/relatorios/analitico" replace /></ProtectedRoute>}
            />
            <Route
              path="/relatorios/analitico"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><RelatoriosAnaliticoPage /></ProtectedRoute>}
            />
            <Route
              path="/relatorios/fechamento"
              element={<ProtectedRoute roles={['superadmin', 'admin']}><RelatoriosFechamentoPage /></ProtectedRoute>}
            />
            <Route
              path="/usuarios"
              element={<ProtectedRoute roles={['superadmin']}><UsuariosPage /></ProtectedRoute>}
            />
            <Route path="/laudos/novo" element={<ProtectedRoute><LaudoPage /></ProtectedRoute>} />
            <Route path="/laudos/:id" element={<ProtectedRoute><LaudoPage /></ProtectedRoute>} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
