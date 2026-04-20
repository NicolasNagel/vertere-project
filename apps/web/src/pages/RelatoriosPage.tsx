import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

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
      <h1 className="text-xl font-semibold mb-4">Relatórios</h1>

      <div className="flex items-end gap-3 mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Data início</label>
          <input type="date" className="mt-1 block border border-gray-200 rounded-md px-3 py-2 text-sm" value={range.data_inicio} onChange={(e) => setRange((p) => ({ ...p, data_inicio: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Data fim</label>
          <input type="date" className="mt-1 block border border-gray-200 rounded-md px-3 py-2 text-sm" value={range.data_fim} onChange={(e) => setRange((p) => ({ ...p, data_fim: e.target.value }))} />
        </div>
        <button onClick={() => setSubmitted(range)} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700">
          Filtrar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-gray-800 mb-3">Receita por Mês</h2>
          {loadingReceita ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-1.5 font-medium text-gray-600">Mês</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Atend.</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Receita</th>
              </tr></thead>
              <tbody>
                {(receita ?? []).map((r: { mes: string; total_atendimentos: number; receita_total: number }) => (
                  <tr key={r.mes} className="border-b border-gray-50">
                    <td className="py-1.5">{new Date(r.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</td>
                    <td className="py-1.5 text-right">{r.total_atendimentos}</td>
                    <td className="py-1.5 text-right font-medium text-primary-700">R$ {Number(r.receita_total).toFixed(2)}</td>
                  </tr>
                ))}
                {!receita?.length && <tr><td colSpan={3} className="text-center text-gray-400 py-4">Sem dados</td></tr>}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="font-medium text-gray-800 mb-3">Volume por Clínica</h2>
          {loadingVolume ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-1.5 font-medium text-gray-600">Clínica</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Atend.</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Receita</th>
              </tr></thead>
              <tbody>
                {(volume?.por_clinica ?? []).map((r: { clinica: string; total: number; receita: number }) => (
                  <tr key={r.clinica} className="border-b border-gray-50">
                    <td className="py-1.5">{r.clinica}</td>
                    <td className="py-1.5 text-right">{r.total}</td>
                    <td className="py-1.5 text-right font-medium text-primary-700">R$ {Number(r.receita).toFixed(2)}</td>
                  </tr>
                ))}
                {!volume?.por_clinica?.length && <tr><td colSpan={3} className="text-center text-gray-400 py-4">Sem dados</td></tr>}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-4 lg:col-span-2">
          <h2 className="font-medium text-gray-800 mb-3">Volume por Veterinário</h2>
          {loadingVolume ? <p className="text-sm text-gray-500">Carregando...</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-1.5 font-medium text-gray-600">Veterinário</th>
                <th className="text-left py-1.5 font-medium text-gray-600">CRMV</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Atend.</th>
                <th className="text-right py-1.5 font-medium text-gray-600">Receita</th>
              </tr></thead>
              <tbody>
                {(volume?.por_veterinario ?? []).map((r: { veterinario: string; crmv: string; total: number; receita: number }) => (
                  <tr key={r.crmv} className="border-b border-gray-50">
                    <td className="py-1.5">{r.veterinario}</td>
                    <td className="py-1.5 text-gray-600">{r.crmv}</td>
                    <td className="py-1.5 text-right">{r.total}</td>
                    <td className="py-1.5 text-right font-medium text-primary-700">R$ {Number(r.receita).toFixed(2)}</td>
                  </tr>
                ))}
                {!volume?.por_veterinario?.length && <tr><td colSpan={4} className="text-center text-gray-400 py-4">Sem dados</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
