import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { BarChart3 } from 'lucide-react';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RelatoriosPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [range, setRange] = useState({ data_inicio: firstOfYear, data_fim: today });
  const [submitted, setSubmitted] = useState(range);

  const { data: receita, isLoading: loadingReceita } = useQuery({
    queryKey: ['relatorio-receita', submitted],
    queryFn: () => api.get('/relatorios/receita', { params: submitted }).then((r) => r.data),
  });

  const { data: volume, isLoading: loadingVolume } = useQuery({
    queryKey: ['relatorio-volume', submitted],
    queryFn: () => api.get('/relatorios/volume', { params: submitted }).then((r) => r.data),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios</h1>
      </div>

      {/* Filter bar */}
      <div className="card px-5 py-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Data início</label>
          <input
            type="date"
            className="input w-40"
            value={range.data_inicio}
            onChange={(e) => setRange((p) => ({ ...p, data_inicio: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Data fim</label>
          <input
            type="date"
            className="input w-40"
            value={range.data_fim}
            onChange={(e) => setRange((p) => ({ ...p, data_fim: e.target.value }))}
          />
        </div>
        <button className="btn-primary" onClick={() => setSubmitted(range)}>
          <BarChart3 size={14} /> Filtrar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by month */}
        <section className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3>Receita por Mês</h3>
          </div>
          {loadingReceita ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="th">Mês</th>
                  <th className="th text-right">Atend.</th>
                  <th className="th text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {(receita ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="td text-center text-slate-400 py-6">Sem dados no período</td></tr>
                ) : (receita ?? []).map((r: { mes: string; total_atendimentos: number; receita_total: number }) => (
                  <tr key={r.mes} className="tr">
                    <td className="td capitalize">
                      {new Date(r.mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </td>
                    <td className="td text-right tabular-nums">{r.total_atendimentos}</td>
                    <td className="td text-right font-semibold tabular-nums text-brand-700">{fmt(Number(r.receita_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Volume by clinic */}
        <section className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3>Volume por Clínica</h3>
          </div>
          {loadingVolume ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="th">Clínica</th>
                  <th className="th text-right">Atend.</th>
                  <th className="th text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {(volume?.por_clinica ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="td text-center text-slate-400 py-6">Sem dados no período</td></tr>
                ) : (volume?.por_clinica ?? []).map((r: { clinica: string; total: number; receita: number }) => (
                  <tr key={r.clinica} className="tr">
                    <td className="td">{r.clinica}</td>
                    <td className="td text-right tabular-nums">{r.total}</td>
                    <td className="td text-right font-semibold tabular-nums text-brand-700">{fmt(Number(r.receita))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Volume by vet */}
        <section className="card overflow-hidden lg:col-span-2">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3>Volume por Veterinário</h3>
          </div>
          {loadingVolume ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="th">Veterinário</th>
                  <th className="th">CRMV</th>
                  <th className="th text-right">Atend.</th>
                  <th className="th text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {(volume?.por_veterinario ?? []).length === 0 ? (
                  <tr><td colSpan={4} className="td text-center text-slate-400 py-6">Sem dados no período</td></tr>
                ) : (volume?.por_veterinario ?? []).map((r: { veterinario: string; crmv: string; total: number; receita: number }) => (
                  <tr key={r.crmv} className="tr">
                    <td className="td font-medium text-slate-900">{r.veterinario}</td>
                    <td className="td font-mono text-xs">{r.crmv}</td>
                    <td className="td text-right tabular-nums">{r.total}</td>
                    <td className="td text-right font-semibold tabular-nums text-brand-700">{fmt(Number(r.receita))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
