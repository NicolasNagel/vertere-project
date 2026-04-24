import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { api } from '../api/client';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import type { Clinica, FechamentoResponse, FechamentoRow } from '../types';

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNum(val: string | number) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function exportToExcel(data: FechamentoResponse, clinicaNome: string, dataInicio: string, dataFim: string) {
  const headers = [
    'Clínica', 'Data', 'Protocolo', 'Veterinário', 'Paciente',
    'Espécie', 'Proprietário', 'Tipo de Exame', 'Exame', 'Tipo',
    'Valor', 'Desconto', 'Adicional', 'Valor Total',
  ];

  const dataRows = data.rows.map((r: FechamentoRow) => [
    r.clinica,
    new Date(r.data).toLocaleDateString('pt-BR'),
    r.protocolo,
    r.veterinario,
    r.paciente,
    r.especie,
    r.proprietario,
    r.tipo_exame,
    r.exame,
    r.tipo,
    Number(r.valor),
    Number(r.desconto),
    Number(r.adicional),
    Number(r.valor_total),
  ]);

  const { totais } = data;
  const emptyRow = Array(14).fill('');

  const sheetData = [
    [`Relatório de Fechamento — ${clinicaNome}`],
    [`Período: ${new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`],
    [],
    headers,
    ...dataRows,
    emptyRow,
    [...Array(10).fill(''), 'Valor Bruto', '', '', totais.valor_bruto],
    [...Array(10).fill(''), 'Descontos', '', '', -totais.descontos],
    [...Array(10).fill(''), 'Adicionais (Plantão)', '', '', totais.adicionais],
    [...Array(10).fill(''), 'Valor Total', '', '', totais.valor_total],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
    { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Fechamento');

  const filename = `fechamento_${clinicaNome.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export default function RelatoriosPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;

  // ── Relatórios gerais ──────────────────────────────────────────────────────
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

  // ── Fechamento ─────────────────────────────────────────────────────────────
  const [fechamentoFilters, setFechamentoFilters] = useState({
    clinica_id: '',
    data_inicio: firstOfYear,
    data_fim: today,
  });
  const [fechamentoSubmitted, setFechamentoSubmitted] = useState<typeof fechamentoFilters | null>(null);

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-ativas'],
    queryFn: () => api.get('/clinicas', { params: { status: 'ativo', limit: 100 } }).then((r) => r.data?.data ?? r.data),
  });

  const { data: fechamento, isLoading: loadingFechamento, error: fechamentoError } = useQuery<FechamentoResponse>({
    queryKey: ['relatorio-fechamento', fechamentoSubmitted],
    queryFn: () =>
      api.get('/relatorios/fechamento', { params: fechamentoSubmitted! }).then((r) => r.data),
    enabled: !!fechamentoSubmitted,
  });

  const clinicaSelecionada = clinicas?.find((c) => c.id === fechamentoFilters.clinica_id);

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios</h1>
      </div>

      {/* ── Filtro geral ──────────────────────────────────────────────────── */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
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

      {/* ── Fechamento ────────────────────────────────────────────────────── */}
      <div className="page-header mt-2 mb-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-800">Relatório de Fechamento</h2>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Consolidado por empresa e período — exportável para Excel</p>
      </div>

      {/* Fechamento filter bar */}
      <div className="card px-5 py-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px]">
          <label className="label">Empresa (Clínica)</label>
          <select
            className="input"
            value={fechamentoFilters.clinica_id}
            onChange={(e) => setFechamentoFilters((p) => ({ ...p, clinica_id: e.target.value }))}
          >
            <option value="">Selecione uma clínica...</option>
            {(clinicas ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Data início</label>
          <input
            type="date"
            className="input w-40"
            value={fechamentoFilters.data_inicio}
            onChange={(e) => setFechamentoFilters((p) => ({ ...p, data_inicio: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Data fim</label>
          <input
            type="date"
            className="input w-40"
            value={fechamentoFilters.data_fim}
            onChange={(e) => setFechamentoFilters((p) => ({ ...p, data_fim: e.target.value }))}
          />
        </div>
        <button
          className="btn-primary"
          disabled={!fechamentoFilters.clinica_id}
          onClick={() => setFechamentoSubmitted({ ...fechamentoFilters })}
        >
          <BarChart3 size={14} /> Gerar
        </button>
        {fechamento && fechamento.rows.length > 0 && (
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() =>
              exportToExcel(
                fechamento,
                clinicaSelecionada?.nome ?? 'Clinica',
                fechamentoSubmitted!.data_inicio,
                fechamentoSubmitted!.data_fim,
              )
            }
          >
            <Download size={14} /> Exportar Excel
          </button>
        )}
      </div>

      {/* Fechamento table */}
      {fechamentoSubmitted && (
        <section className="card overflow-hidden mb-8">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">
                {clinicaSelecionada?.nome ?? '—'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(fechamentoSubmitted.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' '}até{' '}
                {new Date(fechamentoSubmitted.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
            {fechamento && (
              <span className="text-xs text-slate-400">
                {fechamento.rows.length} atendimento{fechamento.rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loadingFechamento ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">Carregando...</div>
          ) : fechamentoError ? (
            <div className="px-5 py-10 text-center text-sm text-red-500">Erro ao carregar os dados. Verifique os filtros e tente novamente.</div>
          ) : !fechamento || fechamento.rows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhum atendimento encontrado no período selecionado.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="th whitespace-nowrap">Clínica</th>
                      <th className="th whitespace-nowrap">Data</th>
                      <th className="th whitespace-nowrap">Protocolo</th>
                      <th className="th whitespace-nowrap">Veterinário</th>
                      <th className="th whitespace-nowrap">Paciente</th>
                      <th className="th whitespace-nowrap">Espécie</th>
                      <th className="th whitespace-nowrap">Proprietário</th>
                      <th className="th whitespace-nowrap">Tipo de Exame</th>
                      <th className="th whitespace-nowrap">Exame</th>
                      <th className="th whitespace-nowrap">Tipo</th>
                      <th className="th text-right whitespace-nowrap">Valor</th>
                      <th className="th text-right whitespace-nowrap">Desconto</th>
                      <th className="th text-right whitespace-nowrap">Adicional</th>
                      <th className="th text-right whitespace-nowrap">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechamento.rows.map((r, idx) => (
                      <tr key={idx} className="tr">
                        <td className="td whitespace-nowrap">{r.clinica}</td>
                        <td className="td whitespace-nowrap tabular-nums">
                          {new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="td font-mono text-xs whitespace-nowrap">{r.protocolo}</td>
                        <td className="td whitespace-nowrap">{r.veterinario}</td>
                        <td className="td whitespace-nowrap">{r.paciente}</td>
                        <td className="td whitespace-nowrap">{r.especie}</td>
                        <td className="td whitespace-nowrap">{r.proprietario}</td>
                        <td className="td whitespace-nowrap">{r.tipo_exame}</td>
                        <td className="td">{r.exame}</td>
                        <td className="td whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            r.tipo === 'Plantão'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {r.tipo}
                          </span>
                        </td>
                        <td className="td text-right tabular-nums">{fmtNum(r.valor)}</td>
                        <td className="td text-right tabular-nums text-red-600">
                          {Number(r.desconto) > 0 ? `- ${fmtNum(r.desconto)}` : '—'}
                        </td>
                        <td className="td text-right tabular-nums text-emerald-700">
                          {Number(r.adicional) > 0 ? fmtNum(r.adicional) : '—'}
                        </td>
                        <td className="td text-right tabular-nums font-semibold text-brand-700">
                          {fmtNum(r.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totais */}
              <div className="border-t border-slate-200 px-5 py-4 flex flex-wrap justify-end gap-8 bg-slate-50">
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Valor Bruto</p>
                  <p className="text-base font-semibold text-slate-700 tabular-nums">
                    {fmt(fechamento.totais.valor_bruto)}
                  </p>
                </div>
                {fechamento.totais.descontos > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Descontos</p>
                    <p className="text-base font-semibold text-red-600 tabular-nums">
                      - {fmt(fechamento.totais.descontos)}
                    </p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Adicionais</p>
                  <p className="text-base font-semibold text-emerald-700 tabular-nums">
                    {fmt(fechamento.totais.adicionais)}
                  </p>
                </div>
                <div className="text-right border-l border-slate-300 pl-8">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Valor Total</p>
                  <p className="text-xl font-bold text-brand-700 tabular-nums">
                    {fmt(fechamento.totais.valor_total)}
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
