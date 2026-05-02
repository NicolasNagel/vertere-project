import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Award, ChevronUp, ChevronDown,
  Trophy, AlertTriangle, Info, Star, Users, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, LabelList, ReferenceLine,
} from 'recharts';
import type { Clinica } from '../types';

/* ── Formatters ─────────────────────────────────────────────────────────────── */

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtShort(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}
function fmtMonth(mesStr: string) {
  const [y, m] = mesStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}
function fmtPeriod(start: string, end: string) {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const months = (ey - sy) * 12 + (em - sm) + 1;
  const sL = new Date(sy, sm - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const eL = new Date(ey, em - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  return { range: `${sL} – ${eL}`, months };
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const NAVY          = '#2D4472';
const TEAL          = '#7BBFC4';
const EMERALD       = '#10b981';
const ROSE          = '#fb7185';
const CLINIC_COLORS = ['#1e3a5f', '#2D4472', '#3d5a8a', '#4d70a2', '#6b8eba', '#8cb3d0'];

const TT = {
  wrapperStyle: { zIndex: 50, outline: 'none' },
  contentStyle: { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgb(0 0 0 / .08)' },
};

/* ── Types ──────────────────────────────────────────────────────────────────── */

type ReceitaRow = { mes: string; total_atendimentos: number; receita_total: number };
type ClinicaRow = { clinica: string; total: number; receita: number };
type VetRow     = { veterinario: string; crmv: string; total: number; receita: number };
type CatRow     = { categoria: string; total: number; receita: number };
type TicketRow  = { mes: string; ticket_medio: number; total: number };
type PlantaoRow = { tipo: string; total: number; receita: number };
type SortCol    = 'total' | 'receita';
type SortDir    = 'desc' | 'asc';

/* ── Small helpers ──────────────────────────────────────────────────────────── */

function SortIcon({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <ChevronDown size={12} className="text-slate-300 ml-0.5" />;
  return dir === 'desc'
    ? <ChevronDown size={12} className="text-brand-600 ml-0.5" />
    : <ChevronUp   size={12} className="text-brand-600 ml-0.5" />;
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {up ? '+' : ''}{pct}% vs mês ant.
    </span>
  );
}

/* ── Destaques: best/worst mini cards ───────────────────────────────────────── */

function DestaquesMini({ receitaRows, clinicaRows, vetRows }: {
  receitaRows: ReceitaRow[];
  clinicaRows: ClinicaRow[];
  vetRows: VetRow[];
}) {
  if (!receitaRows.length && !clinicaRows.length) return null;

  const peak  = receitaRows.length
    ? receitaRows.reduce((b, r) => Number(r.receita_total) > Number(b.receita_total) ? r : b)
    : null;
  const worst = receitaRows.length > 1
    ? receitaRows.reduce((b, r) => Number(r.receita_total) < Number(b.receita_total) ? r : b)
    : null;
  const topCli = clinicaRows[0] ?? null;
  const topVet = vetRows[0] ?? null;

  type Card = { label: string; value: string; sub: string; border: string; valueColor: string; icon: ReactNode };
  const cards: Card[] = ([
    peak && {
      label: 'Melhor mês', value: fmtMonth(peak.mes),
      sub: `${fmt(Number(peak.receita_total))} · ${peak.total_atendimentos} atend.`,
      border: 'border-l-emerald-400', valueColor: 'text-emerald-700',
      icon: <Star size={13} className="text-emerald-500" />,
    },
    worst && {
      label: 'Pior mês', value: fmtMonth(worst.mes),
      sub: `${fmt(Number(worst.receita_total))} · ${worst.total_atendimentos} atend.`,
      border: 'border-l-rose-400', valueColor: 'text-rose-600',
      icon: <TrendingDown size={13} className="text-rose-400" />,
    },
    topCli && {
      label: 'Top clínica',
      value: topCli.clinica.length > 22 ? topCli.clinica.slice(0, 22) + '…' : topCli.clinica,
      sub: `${fmt(Number(topCli.receita))} · ${topCli.total} atend.`,
      border: 'border-l-brand-400', valueColor: 'text-brand-700',
      icon: <Award size={13} className="text-brand-400" />,
    },
    topVet && {
      label: 'Top veterinário',
      value: topVet.veterinario.split(' ').slice(0, 3).join(' '),
      sub: `${fmt(Number(topVet.receita))} · ${topVet.total} atend.`,
      border: 'border-l-amber-400', valueColor: 'text-amber-700',
      icon: <Trophy size={13} className="text-amber-400" />,
    },
  ] as (Card | null | false)[]).filter(Boolean) as Card[];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((c, i) => (
        <div key={i} className={`card px-4 py-3 border-l-[3px] ${c.border}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {c.icon}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">{c.label}</p>
          </div>
          <p className={`text-sm font-bold truncate ${c.valueColor}`}>{c.value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Diagnóstico banner ─────────────────────────────────────────────────────── */

type Insight = { icon: ReactNode; text: string; color: 'green' | 'yellow' | 'red' | 'blue' };

function DiagnosticoBanner({ receitaRows, clinicaRows, vetRows, ticketRows, dataInicio, dataFim }: {
  receitaRows: ReceitaRow[];
  clinicaRows: ClinicaRow[];
  vetRows: VetRow[];
  ticketRows: TicketRow[];
  dataInicio: string;
  dataFim: string;
}) {
  if (!receitaRows.length) return null;

  const insights: Insight[] = [];
  const totalR = receitaRows.reduce((s, r) => s + Number(r.receita_total), 0);

  /* 1. Revenue trend: 1st half vs 2nd half */
  if (receitaRows.length >= 2) {
    const mid = Math.floor(receitaRows.length / 2);
    const r1  = receitaRows.slice(0, mid).reduce((s, r) => s + Number(r.receita_total), 0);
    const r2  = receitaRows.slice(mid).reduce((s, r) => s + Number(r.receita_total), 0);
    const p   = r1 > 0 ? Math.round(((r2 - r1) / r1) * 100) : null;
    if (p !== null) {
      if (p >= 20)       insights.push({ icon: <TrendingUp size={14} />,   color: 'green',
        text: `Crescimento expressivo de ${p}% na 2ª metade — avalie se a estrutura de atendimento suporta o volume crescente` });
      else if (p >= 5)   insights.push({ icon: <TrendingUp size={14} />,   color: 'green',
        text: `Receita cresceu ${p}% — tendência positiva e sustentável no período` });
      else if (p > -5)   insights.push({ icon: <Activity size={14} />,     color: 'yellow',
        text: `Receita estável (${p > 0 ? '+' : ''}${p}%) — base consolidada. Para crescer, considere prospectar novas clínicas parceiras` });
      else if (p > -20)  insights.push({ icon: <TrendingDown size={14} />, color: 'red',
        text: `Receita caiu ${Math.abs(p)}% na 2ª metade — identifique clínicas ou meses com menor envio e investigue a causa` });
      else               insights.push({ icon: <TrendingDown size={14} />, color: 'red',
        text: `Queda expressiva de ${Math.abs(p)}% — revise urgentemente os principais clientes e períodos afetados` });
    }
  }

  /* 2. Sazonalidade / variabilidade */
  if (receitaRows.length >= 3) {
    const maxR = Math.max(...receitaRows.map(r => Number(r.receita_total)));
    const minR = Math.min(...receitaRows.map(r => Number(r.receita_total)));
    if (maxR > 0) {
      const ratio = Math.round(minR / maxR * 100);
      if (ratio < 40) {
        const worstRow = receitaRows.find(r => Number(r.receita_total) === minR)!;
        insights.push({ icon: <Calendar size={14} />, color: 'yellow',
          text: `Pior mês (${fmtMonth(worstRow.mes)}) gerou ${ratio}% do melhor — sazonalidade acentuada. Planeje reserva de caixa para os meses de baixa` });
      }
    }
  }

  /* 3. Clinic concentration */
  const totCli = clinicaRows.reduce((s, r) => s + Number(r.receita), 0);
  if (clinicaRows.length >= 2 && totCli > 0) {
    const topP = Math.round(Number(clinicaRows[0].receita) / totCli * 100);
    if (topP > 70)      insights.push({ icon: <AlertTriangle size={14} />, color: 'red',
      text: `${clinicaRows[0].clinica} concentra ${topP}% da receita — dependência crítica. Uma queda no envio desta clínica afeta diretamente o resultado` });
    else if (topP > 50) insights.push({ icon: <AlertTriangle size={14} />, color: 'yellow',
      text: `${clinicaRows[0].clinica} representa ${topP}% do faturamento — considere diversificar parcerias para reduzir exposição` });
    else                insights.push({ icon: <Info size={14} />,          color: 'blue',
      text: `Receita distribuída entre ${clinicaRows.length} clínicas (maior: ${topP}%) — base diversificada reduz risco operacional` });
  }

  /* 4. Vet dominance */
  const totVet = vetRows.reduce((s, r) => s + Number(r.receita), 0);
  if (vetRows.length >= 2 && totVet > 0) {
    const topVP = Math.round(Number(vetRows[0].receita) / totVet * 100);
    if (topVP >= 50)      insights.push({ icon: <Users size={14} />, color: 'yellow',
      text: `${vetRows[0].veterinario} gera ${topVP}% da receita veterinária — profissional estratégico. Fortaleça esse vínculo e busque ampliar a base de vets ativos` });
    else if (topVP >= 30) insights.push({ icon: <Users size={14} />, color: 'blue',
      text: `${vetRows[0].veterinario} lidera com ${topVP}% da receita — mantenha esse relacionamento e incentive os demais vets a aumentarem o volume` });
  }

  /* 5. Ticket trend */
  if (ticketRows.length >= 4) {
    const tmid = Math.floor(ticketRows.length / 2);
    const t1 = ticketRows.slice(0, tmid).reduce((s, r) => s + Number(r.ticket_medio), 0) / tmid;
    const t2 = ticketRows.slice(tmid).reduce((s, r) => s + Number(r.ticket_medio), 0) / (ticketRows.length - tmid);
    const tp = t1 > 0 ? Math.round(((t2 - t1) / t1) * 100) : null;
    if (tp !== null && Math.abs(tp) >= 5) {
      insights.push({
        icon: tp > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
        color: tp > 0 ? 'green' : 'red',
        text: tp > 0
          ? `Ticket médio subiu ${tp}% (${fmt(t1)} → ${fmt(t2)}) — pedidos mais complexos ou precificação melhor`
          : `Ticket médio caiu ${Math.abs(tp)}% (${fmt(t1)} → ${fmt(t2)}) — verifique mix de exames e política de descontos`,
      });
    }
  }

  /* 6. Consistency: months above monthly average */
  if (receitaRows.length >= 3 && insights.length < 6) {
    const avg   = totalR / receitaRows.length;
    const above = receitaRows.filter(r => Number(r.receita_total) >= avg).length;
    const abP   = Math.round(above / receitaRows.length * 100);
    if (abP >= 65)      insights.push({ icon: <Activity size={14} />,     color: 'green',
      text: `${above} de ${receitaRows.length} meses superaram a média (${fmtShort(avg)}) — receita previsível e consistente, bom para planejamento de caixa` });
    else if (abP <= 35) insights.push({ icon: <AlertTriangle size={14} />, color: 'yellow',
      text: `Apenas ${above} de ${receitaRows.length} meses superaram a média (${fmtShort(avg)}) — alta volatilidade mensal dificulta o planejamento financeiro` });
  }

  if (!insights.length) return null;

  const CM = {
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-800', icon: 'text-emerald-500', border: 'border-emerald-100' },
    yellow: { bg: 'bg-amber-50',   text: 'text-amber-800',   icon: 'text-amber-500',   border: 'border-amber-100'  },
    red:    { bg: 'bg-red-50',     text: 'text-red-700',     icon: 'text-red-500',     border: 'border-red-100'    },
    blue:   { bg: 'bg-brand-50',   text: 'text-brand-700',   icon: 'text-brand-500',   border: 'border-brand-100'  },
  };

  const { range, months } = fmtPeriod(dataInicio, dataFim);

  return (
    <div className="card px-5 py-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={15} className="text-slate-400" />
        <p className="text-xs font-semibold text-slate-700">
          Diagnóstico do período
          <span className="font-normal text-slate-400 ml-2">{range} · {months} {months === 1 ? 'mês' : 'meses'}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {insights.map((ins, i) => {
          const c = CM[ins.color];
          return (
            <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${c.bg} border ${c.border}`}>
              <span className={`mt-0.5 shrink-0 ${c.icon}`}>{ins.icon}</span>
              <span className={`text-xs leading-relaxed ${c.text}`}>{ins.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function RelatoriosAnaliticoPage() {
  const today      = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [range,      setRange]      = useState({ data_inicio: oneYearAgo, data_fim: today, clinica_id: '' });
  const [submitted,  setSubmitted]  = useState({ data_inicio: oneYearAgo, data_fim: today, clinica_id: '' });
  const [showAllVets,     setShowAllVets]     = useState(false);
  const [vetSort,         setVetSort]         = useState<{ col: SortCol; dir: SortDir }>({ col: 'total', dir: 'desc' });
  const [showAllCats,     setShowAllCats]     = useState(false);
  const [showAllClinicas, setShowAllClinicas] = useState(false);

  /* ── Queries ── */

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-ativas'],
    queryFn: () => api.get('/clinicas', { params: { status: 'ativo', limit: 100 } }).then(r => r.data?.data ?? r.data),
  });

  const params = {
    data_inicio: submitted.data_inicio,
    data_fim:    submitted.data_fim,
    ...(submitted.clinica_id ? { clinica_id: submitted.clinica_id } : {}),
  };

  const { data: receita,  isLoading: loadingReceita  } = useQuery<ReceitaRow[]>({
    queryKey: ['relatorio-receita',  submitted],
    queryFn:  () => api.get('/relatorios/receita',  { params }).then(r => r.data),
  });
  const { data: volume,   isLoading: loadingVolume   } = useQuery<{ por_clinica: ClinicaRow[]; por_veterinario: VetRow[] }>({
    queryKey: ['relatorio-volume',   submitted],
    queryFn:  () => api.get('/relatorios/volume',   { params }).then(r => r.data),
  });
  const { data: insights, isLoading: loadingInsights } = useQuery<{ categorias: CatRow[]; ticket_medio: TicketRow[]; plantao_vs_normal: PlantaoRow[] }>({
    queryKey: ['relatorio-insights', submitted],
    queryFn:  () => api.get('/relatorios/insights', { params }).then(r => r.data),
  });

  /* ── Derived data ── */

  const receitaRows = receita ?? [];
  const clinicaRows = volume?.por_clinica     ?? [];
  const vetRows     = volume?.por_veterinario ?? [];
  const catRows     = insights?.categorias        ?? [];
  const ticketRows  = insights?.ticket_medio      ?? [];
  const plantaoRows = insights?.plantao_vs_normal ?? [];

  const normal   = plantaoRows.find(r => r.tipo === 'Normal');
  const plantao  = plantaoRows.find(r => r.tipo === 'Plantão');
  const recTot   = Number(normal?.receita ?? 0) + Number(plantao?.receita ?? 0);
  const plantaoPct = recTot > 0 ? Math.round(Number(plantao?.receita ?? 0) / recTot * 100) : 0;

  const totalAtend   = receitaRows.reduce((s, r) => s + Number(r.total_atendimentos), 0);
  const totalReceita = receitaRows.reduce((s, r) => s + Number(r.receita_total), 0);
  const ticketMedio  = totalAtend > 0 ? totalReceita / totalAtend : 0;

  const peakMonth = receitaRows.length
    ? receitaRows.reduce((b, r) => Number(r.receita_total) > Number(b.receita_total) ? r : b)
    : null;

  const li = receitaRows.length - 1;
  const momReceita = li >= 1
    ? Math.round(((Number(receitaRows[li].receita_total) - Number(receitaRows[li - 1].receita_total)) / Number(receitaRows[li - 1].receita_total)) * 100)
    : null;
  const momAtend = li >= 1
    ? Math.round(((Number(receitaRows[li].total_atendimentos) - Number(receitaRows[li - 1].total_atendimentos)) / Number(receitaRows[li - 1].total_atendimentos)) * 100)
    : null;
  const lastTicket = ticketRows.length > 0 ? Number(ticketRows[ticketRows.length - 1].ticket_medio) : null;
  const prevTicket = ticketRows.length > 1 ? Number(ticketRows[ticketRows.length - 2].ticket_medio) : null;
  const momTicket  = lastTicket !== null && prevTicket && prevTicket > 0
    ? Math.round(((lastTicket - prevTicket) / prevTicket) * 100) : null;

  /* ── Chart data ── */

  const avgMonthlyReceita = receitaRows.length > 0 ? totalReceita / receitaRows.length : 0;
  const maxMonthReceita   = receitaRows.length > 0 ? Math.max(...receitaRows.map(r => Number(r.receita_total))) : 0;
  const minMonthReceita   = receitaRows.length > 1 ? Math.min(...receitaRows.map(r => Number(r.receita_total))) : -1;
  const hasVariance       = maxMonthReceita > minMonthReceita && minMonthReceita >= 0;

  const chartReceita = receitaRows.map(r => ({
    mes: fmtMonth(r.mes), receita: Number(r.receita_total), atendimentos: Number(r.total_atendimentos),
  }));

  const recTotCli      = clinicaRows.reduce((s, r) => s + Number(r.receita), 0);
  const allChartClinica = clinicaRows.map((r, i) => {
    const receita = Number(r.receita);
    const total   = Number(r.total);
    const pct     = recTotCli > 0 ? Math.round(receita / recTotCli * 100) : 0;
    const ticket  = total > 0 ? receita / total : 0;
    return {
      nome:         r.clinica.length > 18 ? r.clinica.slice(0, 18) + '…' : r.clinica,
      nomeCompleto: r.clinica,
      receita, total, pct, ticket,
      fill:  CLINIC_COLORS[Math.min(i, CLINIC_COLORS.length - 1)],
      label: `${fmtShort(receita)} · ${pct}%`,
    };
  });
  const CLINICA_PAGE  = 5;
  const chartClinica  = showAllClinicas ? allChartClinica : allChartClinica.slice(0, CLINICA_PAGE);

  const cliTop2Pct     = allChartClinica.length > 1
    ? allChartClinica[0].pct + allChartClinica[1].pct
    : allChartClinica[0]?.pct ?? 0;
  const cliHighTicket  = allChartClinica.filter(c => c.total > 0).sort((a, b) => b.ticket - a.ticket)[0] ?? null;
  const cliLowTicket   = allChartClinica.filter(c => c.total >= 3).sort((a, b) => a.ticket - b.ticket)[0] ?? null;
  const cliInsight     = allChartClinica.length > 0 ? (() => {
    const top1 = allChartClinica[0];
    if (top1.pct > 60)
      return `${top1.nomeCompleto} concentra ${top1.pct}% da receita — qualquer redução de envios impacta diretamente o resultado`;
    if (cliTop2Pct > 75 && allChartClinica.length > 1)
      return `${allChartClinica[0].nomeCompleto} e ${allChartClinica[1].nomeCompleto} somam ${cliTop2Pct}% — carteira concentrada nas 2 principais`;
    return `${allChartClinica.length} clínicas ativas · maior participação: ${top1.nomeCompleto} (${top1.pct}%) — distribuição equilibrada`;
  })() : null;

  const totalPedidos  = catRows.reduce((s, r) => s + Number(r.total), 0);
  const totalRecCat   = catRows.reduce((s, r) => s + Number(r.receita), 0);
  const allChartCat   = catRows.map(r => {
    const total   = Number(r.total);
    const receita = Number(r.receita);
    const pct     = totalPedidos > 0 ? Math.round(total / totalPedidos * 100) : 0;
    const pctRec  = totalRecCat > 0 ? Math.round(receita / totalRecCat * 100) : 0;
    const ticket  = total > 0 ? receita / total : 0;
    return { nome: r.categoria, total, receita, pct, pctRec, ticket, label: `${total} ped. · ${fmtShort(receita)}` };
  });
  const CAT_PAGE    = 6;
  const chartCat    = showAllCats ? allChartCat : allChartCat.slice(0, CAT_PAGE);

  const catTopByVol = allChartCat[0] ?? null;
  const catTopByRec = allChartCat.length > 0
    ? [...allChartCat].sort((a, b) => b.receita - a.receita)[0] : null;
  const catTopTkt   = allChartCat.filter(c => c.total > 0).length > 0
    ? [...allChartCat].filter(c => c.total > 0).sort((a, b) => b.ticket - a.ticket)[0] : null;
  const catInsight  = catTopByVol && catTopByRec
    ? catTopByVol.nome === catTopByRec.nome
      ? `${catTopByVol.nome} lidera em volume (${catTopByVol.pct}% dos pedidos) e em receita (${fmtShort(catTopByVol.receita)}) — categoria mais estratégica do período`
      : `Mais solicitado: ${catTopByVol.nome} (${catTopByVol.pct}% dos pedidos) · Maior receita: ${catTopByRec.nome} (${fmtShort(catTopByRec.receita)}, ${catTopByRec.pctRec}%${catTopTkt && catTopTkt.nome !== catTopByRec.nome ? ` · Maior ticket: ${catTopTkt.nome} — ${fmt(catTopTkt.ticket)}/pedido` : ''})`
    : null;

  const avgTicket     = ticketRows.length > 0
    ? ticketRows.reduce((s, r) => s + Number(r.ticket_medio), 0) / ticketRows.length
    : 0;
  const maxTicketRow  = ticketRows.length > 0
    ? ticketRows.reduce((b, r) => Number(r.ticket_medio) > Number(b.ticket_medio) ? r : b)
    : null;
  const minTicketRow  = ticketRows.length > 1
    ? ticketRows.reduce((b, r) => Number(r.ticket_medio) < Number(b.ticket_medio) ? r : b)
    : null;
  const ticketVarPct  = maxTicketRow && minTicketRow && Number(minTicketRow.ticket_medio) > 0
    ? Math.round(((Number(maxTicketRow.ticket_medio) - Number(minTicketRow.ticket_medio)) / Number(minTicketRow.ticket_medio)) * 100)
    : null;
  const ticketsAboveAvg = ticketRows.filter(r => Number(r.ticket_medio) >= avgTicket).length;
  const last3TicketAvg  = ticketRows.length >= 3
    ? ticketRows.slice(-3).reduce((s, r) => s + Number(r.ticket_medio), 0) / 3
    : null;
  const ticketInsight = last3TicketAvg !== null && avgTicket > 0
    ? last3TicketAvg > avgTicket * 1.05
      ? { text: `Últimos 3 meses acima da média (${fmt(last3TicketAvg)}) — pedidos mais complexos ou precificação melhor`, color: 'emerald' as const }
      : last3TicketAvg < avgTicket * 0.95
        ? { text: `Últimos 3 meses abaixo da média (${fmt(last3TicketAvg)}) — verifique descontos e mix de exames recentes`, color: 'rose' as const }
        : null
    : null;

  const chartTicket = ticketRows.map(r => ({
    mes: fmtMonth(r.mes), ticket: Number(r.ticket_medio), total: Number(r.total),
  }));

  /* ── Vet table ── */

  const toggleSort = (col: SortCol) => {
    setVetSort(prev => prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' });
    setShowAllVets(false);
  };
  const sortedVets    = [...vetRows].sort((a, b) =>
    vetSort.dir === 'desc' ? Number(b[vetSort.col]) - Number(a[vetSort.col]) : Number(a[vetSort.col]) - Number(b[vetSort.col]),
  );
  const VET_PAGE     = 5;
  const visibleVets  = showAllVets ? sortedVets : sortedVets.slice(0, VET_PAGE);
  const maxVetAttend = vetRows.length > 0 ? Math.max(...vetRows.map(r => Number(r.total))) : 1;

  /* ── Header subtitle ── */
  const { range: periodRange, months: periodMonths } = fmtPeriod(submitted.data_inicio, submitted.data_fim);
  const clinicaLabel = submitted.clinica_id
    ? (clinicas?.find(c => c.id === submitted.clinica_id)?.nome ?? 'Clínica selecionada')
    : 'Todas as clínicas';

  const handleFilter = () => {
    setSubmitted(range);
    setShowAllVets(false);
    setShowAllCats(false);
    setShowAllClinicas(false);
  };

  /* ── Render ── */

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1>Painel Analítico</h1>
        <p className="text-sm text-slate-500 mt-1">
          {periodRange}
          <span className="mx-2 text-slate-300">·</span>
          {clinicaLabel}
          <span className="mx-2 text-slate-300">·</span>
          {periodMonths} {periodMonths === 1 ? 'mês' : 'meses'} analisados
        </p>
      </div>

      {/* Filter bar */}
      <div className="card px-5 py-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-[180px]">
          <label className="label">Clínica</label>
          <select className="input" value={range.clinica_id} onChange={e => setRange(p => ({ ...p, clinica_id: e.target.value }))}>
            <option value="">Todas as clínicas</option>
            {(clinicas ?? []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data início</label>
          <input type="date" className="input w-40" value={range.data_inicio}
            onChange={e => setRange(p => ({ ...p, data_inicio: e.target.value }))} />
        </div>
        <div>
          <label className="label">Data fim</label>
          <input type="date" className="input w-40" value={range.data_fim}
            onChange={e => setRange(p => ({ ...p, data_fim: e.target.value }))} />
        </div>
        <button className="btn-primary" onClick={handleFilter}>
          <BarChart3 size={14} /> Filtrar
        </button>
      </div>

      {/* KPI cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Activity size={16} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 truncate">Atendimentos</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalAtend.toLocaleString('pt-BR')}</p>
            <DeltaBadge pct={momAtend} />
          </div>
        </div>

        <div className="card px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 truncate">Receita Total</p>
            <p className="text-xl font-bold text-brand-700 tabular-nums leading-tight">{fmtShort(totalReceita)}</p>
            <DeltaBadge pct={momReceita} />
          </div>
        </div>

        <div className="card px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Award size={16} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 truncate">Ticket Médio</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums leading-tight">{fmt(ticketMedio)}</p>
            <DeltaBadge pct={momTicket} />
          </div>
        </div>

        <div className="card px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Star size={16} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5 truncate">Melhor Mês</p>
            <p className="text-lg font-bold text-slate-900 capitalize leading-tight">
              {peakMonth ? fmtMonth(peakMonth.mes) : '—'}
            </p>
            {peakMonth && (
              <p className="text-xs text-brand-600 font-medium tabular-nums">{fmtShort(Number(peakMonth.receita_total))}</p>
            )}
          </div>
        </div>
      </div>

      {/* Destaques (best/worst) */}
      {(loadingReceita || loadingVolume) ? null : (
        <DestaquesMini receitaRows={receitaRows} clinicaRows={clinicaRows} vetRows={vetRows} />
      )}

      {/* Diagnóstico */}
      {!loadingReceita && !loadingVolume && !loadingInsights && (
        <DiagnosticoBanner
          receitaRows={receitaRows}
          clinicaRows={clinicaRows}
          vetRows={vetRows}
          ticketRows={ticketRows}
          dataInicio={submitted.data_inicio}
          dataFim={submitted.data_fim}
        />
      )}

      {/* Monthly revenue chart */}
      <div className="card px-5 py-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="mb-0.5">Receita por Mês</h3>
            <p className="text-xs text-slate-400">Linha tracejada = média do período · cores indicam melhor e pior mês</p>
          </div>
          {hasVariance && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: EMERALD }} /> Melhor
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: ROSE }} /> Pior
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TEAL }} /> Atual
              </span>
            </div>
          )}
        </div>
        {loadingReceita ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-400">Carregando...</div>
        ) : chartReceita.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartReceita} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              {avgMonthlyReceita > 0 && (
                <ReferenceLine y={avgMonthlyReceita} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5}
                  label={{ value: `Média ${fmtShort(avgMonthlyReceita)}`, position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                />
              )}
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'receita' ? fmt(value) : `${value} atend.`,
                  name === 'receita' ? 'Receita' : 'Atendimentos',
                ]}
                {...TT}
              />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="receita" position="top" formatter={(v: number) => fmtShort(v)}
                  style={{ fontSize: 10, fill: '#64748b' }} />
                {chartReceita.map((r, i) => {
                  const isMax  = hasVariance && r.receita === maxMonthReceita;
                  const isMin  = hasVariance && receitaRows.length > 2 && r.receita === minMonthReceita;
                  const isLast = i === chartReceita.length - 1;
                  return <Cell key={i} fill={isMax ? EMERALD : isMin ? ROSE : isLast ? TEAL : NAVY} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Clinic + Vet grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Clinic chart */}
        <div className="card px-5 py-5">
          <h3 className="mb-0.5">Receita por Clínica</h3>
          <div className="mb-4">
            <p className="text-xs text-slate-400">Cores mais escuras = maior participação · rótulos: receita e % do total</p>
            {!loadingVolume && cliInsight && (
              <p className="text-xs font-medium text-brand-700 mt-1">{cliInsight}</p>
            )}
          </div>
          {loadingVolume ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">Carregando...</div>
          ) : chartClinica.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.min(Math.max(160, chartClinica.length * 48), 280)}>
                <BarChart data={chartClinica} layout="vertical" margin={{ top: 0, right: 84, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, outline: 'none' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof allChartClinica)[0];
                      return (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, boxShadow: '0 2px 8px rgb(0 0 0/.08)' }}>
                          <p style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>{d.nomeCompleto}</p>
                          <p style={{ color: '#64748b' }}>{fmt(d.receita)} <span style={{ color: '#94a3b8' }}>({d.pct}% do total)</span></p>
                          <p style={{ color: '#64748b' }}>{d.total} atendimentos</p>
                          <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 11 }}>Ticket médio {fmt(d.ticket)}/atend.</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="label" position="right" style={{ fontSize: 10, fill: '#94a3b8' }} />
                    {chartClinica.map((_, i) => (
                      <Cell key={i} fill={CLINIC_COLORS[Math.min(i, CLINIC_COLORS.length - 1)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Mini stats */}
              {allChartClinica.length >= 2 && (
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Top clínica</p>
                    <p className="text-xs font-bold text-brand-700 tabular-nums">{allChartClinica[0].pct}%</p>
                    <p className="text-[10px] text-slate-400 truncate px-1" title={allChartClinica[0].nomeCompleto}>{allChartClinica[0].nome}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Top 2 juntas</p>
                    <p className="text-xs font-bold text-slate-700 tabular-nums">{cliTop2Pct}%</p>
                    <p className="text-[10px] text-slate-400">da receita</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Maior ticket</p>
                    <p className="text-xs font-bold text-emerald-600 tabular-nums">{cliHighTicket ? fmtShort(cliHighTicket.ticket) : '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate px-1" title={cliHighTicket?.nomeCompleto}>{cliHighTicket?.nome ?? ''}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Menor ticket</p>
                    <p className="text-xs font-bold text-rose-500 tabular-nums">{cliLowTicket ? fmtShort(cliLowTicket.ticket) : '—'}</p>
                    <p className="text-[10px] text-slate-400 truncate px-1" title={cliLowTicket?.nomeCompleto}>{cliLowTicket?.nome ?? ''}</p>
                  </div>
                </div>
              )}

              {allChartClinica.length > CLINICA_PAGE && (
                <div className="pt-2.5 flex justify-center border-t border-slate-100 mt-3">
                  <button className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    onClick={() => setShowAllClinicas(v => !v)}>
                    {showAllClinicas ? 'Mostrar menos' : `Ver todas (${allChartClinica.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Vet table */}
        <div className="card overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="mb-0">Volume por Veterinário</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {vetRows.length > 0 ? `Top ${Math.min(VET_PAGE, vetRows.length)} do período` : 'Período selecionado'} — clique nos cabeçalhos para ordenar
            </p>
          </div>
          {loadingVolume ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : vetRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Sem dados no período</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="th w-6">#</th>
                    <th className="th">Veterinário</th>
                    <th className="th text-right cursor-pointer select-none hover:text-brand-700" onClick={() => toggleSort('total')}>
                      <span className="inline-flex items-center justify-end">Atend. <SortIcon col="total" active={vetSort.col} dir={vetSort.dir} /></span>
                    </th>
                    <th className="th text-right cursor-pointer select-none hover:text-brand-700" onClick={() => toggleSort('receita')}>
                      <span className="inline-flex items-center justify-end">Receita <SortIcon col="receita" active={vetSort.col} dir={vetSort.dir} /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVets.map(r => {
                    const rank = sortedVets.indexOf(r) + 1;
                    const barW = maxVetAttend > 0 ? Math.round(Number(r.total) / maxVetAttend * 100) : 0;
                    return (
                      <tr key={r.crmv} className="tr">
                        <td className="td text-center">
                          {rank === 1
                            ? <Trophy size={13} className="text-amber-500 mx-auto" />
                            : <span className="text-xs text-slate-400 tabular-nums">{rank}</span>}
                        </td>
                        <td className="td">
                          <p className="font-medium text-slate-900">{r.veterinario}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{r.crmv}</p>
                        </td>
                        <td className="td text-right">
                          <span className="tabular-nums text-sm">{r.total}</span>
                          <div className="mt-1 h-1 w-12 bg-slate-100 rounded-full overflow-hidden ml-auto">
                            <div className="h-full bg-brand-400 rounded-full" style={{ width: `${barW}%` }} />
                          </div>
                        </td>
                        <td className="td text-right font-semibold tabular-nums text-brand-700">{fmtShort(Number(r.receita))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {vetRows.length > VET_PAGE && (
                <div className="px-5 py-2.5 border-t border-slate-100 flex justify-center">
                  <button className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    onClick={() => setShowAllVets(v => !v)}>
                    {showAllVets ? 'Mostrar menos' : `Ver todos (${vetRows.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Análises Detalhadas ── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Análises Detalhadas</h2>

        {/* Categories */}
        <div className="card px-5 py-5 mb-6">
          <h3 className="mb-0.5">Categorias de Exames Solicitados</h3>
          <div className="mb-4">
            <p className="text-xs text-slate-400">Plantão excluído · ordenado por frequência · rótulo: quantidade de pedidos e receita gerada</p>
            {!loadingInsights && catInsight && (
              <p className="text-xs font-medium text-brand-700 mt-1 leading-relaxed">{catInsight}</p>
            )}
          </div>
          {loadingInsights ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">Carregando...</div>
          ) : chartCat.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(120, chartCat.length * 40)}>
                <BarChart data={chartCat} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nome" width={160} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, outline: 'none' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof allChartCat)[0];
                      return (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, boxShadow: '0 2px 8px rgb(0 0 0 / .08)' }}>
                          <p style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>{d.nome}</p>
                          <p style={{ color: '#64748b' }}>{d.total} pedidos <span style={{ color: '#94a3b8' }}>({d.pct}% do total)</span></p>
                          <p style={{ color: '#64748b' }}>{fmt(d.receita)} <span style={{ color: '#94a3b8' }}>({d.pctRec}% da receita)</span></p>
                          <p style={{ color: '#94a3b8', marginTop: 4, fontSize: 11 }}>Média {fmt(d.ticket)} por pedido</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" fill={NAVY} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="label" position="right" style={{ fontSize: 10, fill: '#94a3b8' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {allChartCat.length > CAT_PAGE && (
                <div className="pt-2.5 flex justify-center border-t border-slate-100 mt-2">
                  <button className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    onClick={() => setShowAllCats(v => !v)}>
                    {showAllCats ? 'Mostrar menos' : `Ver todas (${allChartCat.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Médio */}
          <div className="card px-5 py-5">
            <h3 className="mb-0.5">Ticket Médio por Mês</h3>
            <div className="mb-4">
              <p className="text-xs text-slate-400">Ponto verde = acima da média · vermelho = abaixo · tracejado = média geral</p>
              {!loadingInsights && ticketInsight && (
                <p className={`text-xs font-medium mt-1 ${ticketInsight.color === 'emerald' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {ticketInsight.text}
                </p>
              )}
            </div>
            {loadingInsights ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">Carregando...</div>
            ) : chartTicket.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={168}>
                  <LineChart data={chartTicket} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v.toFixed(0)}`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    {avgTicket > 0 && (
                      <ReferenceLine y={avgTicket} stroke="#94a3b8" strokeDasharray="4 2" strokeWidth={1.5}
                        label={{ value: `Média ${fmt(avgTicket)}`, position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
                      />
                    )}
                    <Tooltip
                      {...TT}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { mes: string; ticket: number; total: number };
                        const above = d.ticket >= avgTicket;
                        return (
                          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 12, boxShadow: '0 2px 8px rgb(0 0 0/.08)' }}>
                            <p style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>{d.mes}</p>
                            <p style={{ color: above ? '#059669' : '#f43f5e' }}>
                              {fmt(d.ticket)} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({above ? '+' : ''}{avgTicket > 0 ? Math.round((d.ticket - avgTicket) / avgTicket * 100) : 0}% vs média)</span>
                            </p>
                            <p style={{ color: '#94a3b8', marginTop: 3 }}>{d.total} atendimentos</p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone" dataKey="ticket" stroke={TEAL} strokeWidth={2.5}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const color = payload.ticket >= avgTicket ? EMERALD : ROSE;
                        return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
                      }}
                      activeDot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const color = payload.ticket >= avgTicket ? EMERALD : ROSE;
                        return <circle key={`adot-${cx}`} cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Mini stats */}
                {ticketRows.length >= 2 && (
                  <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Maior ticket</p>
                      <p className="text-xs font-bold text-emerald-600 tabular-nums">{maxTicketRow ? fmt(Number(maxTicketRow.ticket_medio)) : '—'}</p>
                      <p className="text-[10px] text-slate-400">{maxTicketRow ? fmtMonth(maxTicketRow.mes) : ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Menor ticket</p>
                      <p className="text-xs font-bold text-rose-500 tabular-nums">{minTicketRow ? fmt(Number(minTicketRow.ticket_medio)) : '—'}</p>
                      <p className="text-[10px] text-slate-400">{minTicketRow ? fmtMonth(minTicketRow.mes) : ''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Variação</p>
                      <p className="text-xs font-bold text-slate-700 tabular-nums">{ticketVarPct !== null ? `${ticketVarPct}%` : '—'}</p>
                      <p className="text-[10px] text-slate-400">entre extremos</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Acima da média</p>
                      <p className="text-xs font-bold text-brand-700 tabular-nums">{ticketsAboveAvg}/{ticketRows.length}</p>
                      <p className="text-[10px] text-slate-400">meses</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Plantão vs Normal */}
          <div className="card px-5 py-5">
            <h3 className="mb-0.5">Plantão vs Atendimento Normal</h3>
            <p className="text-xs text-slate-400 mb-4">Distribuição de receita por tipo · plantão inclui adicional de sobreaviso</p>
            {loadingInsights ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">Carregando...</div>
            ) : plantaoRows.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-400">Sem dados no período</div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-brand-50 px-4 py-3">
                    <p className="text-xs text-brand-600 font-medium mb-1">Normal</p>
                    <p className="text-2xl font-bold text-brand-800 tabular-nums">{normal?.total ?? 0}</p>
                    <p className="text-xs text-brand-600 tabular-nums mt-0.5">{fmt(Number(normal?.receita ?? 0))}</p>
                    <p className="text-[11px] text-brand-400 mt-1 font-medium">{100 - plantaoPct}% da receita</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-4 py-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Plantão</p>
                    <p className="text-2xl font-bold text-amber-800 tabular-nums">{plantao?.total ?? 0}</p>
                    <p className="text-xs text-amber-600 tabular-nums mt-0.5">{fmt(Number(plantao?.receita ?? 0))}</p>
                    <p className="text-[11px] text-amber-500 mt-1 font-medium">{plantaoPct}% da receita</p>
                  </div>
                </div>
                <div>
                  <div className="w-full h-2.5 rounded-full bg-brand-100 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${plantaoPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Plantão <span className="font-semibold text-amber-600">{plantaoPct}%</span>
                    {plantaoPct > 30
                      ? ' — volume expressivo de sobreaviso, verifique se os adicionais estão cobertos'
                      : ' — proporção saudável de atendimentos em horário normal'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
