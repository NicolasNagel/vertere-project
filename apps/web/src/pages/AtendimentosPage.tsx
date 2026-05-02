import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Atendimento, Clinica, Veterinario, Exame, Laudo } from '../types';
import { LAUDO_REGISTRY } from '../components/laudos/registry';
import { sugerirLaudoTipos } from '../utils/laudoTypeMapping';
import type { LaudoSugestao } from '../utils/laudoTypeMapping';
import { Plus, Eye, Activity, X, Pencil, Check, ShoppingCart, Moon, SlidersHorizontal, FileText, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

type IdadeUnidade = '' | 'dias' | 'meses' | 'anos';
type TipoPlantao = '' | 'plantao' | 'plantao_especial';

const METODOS_COLETA = ['Motoboy', 'Helito/Nicolas', 'Internos', 'Uber', 'Marli'];

const CATEGORIA_LABEL: Record<string, string> = {
  hemograma: 'Hemograma',
  urinalise: 'Urinálise',
  ions: 'Íons',
  bioquimico: 'Bioquímico',
  hematocrito: 'Hematócrito',
  reticulocitos: 'Contagem de Reticulócitos',
  hemoparasitas: 'Pesquisa de Hemoparasitas',
  sangue: 'Pesquisa de Sangue Oculto',
  rpc: 'Relação Proteína:Creatinina (RPC)',
  parasitologico: 'Parasitológico de Fezes',
  hemogasometria: 'Hemogasometria',
  reacao: 'Reação Cruzada / Compatibilidade',
};

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const emptyForm = {
  clinica_id: '', veterinario_id: '',
  nome_animal: '', raca: '', especie: '',
  sexo: '' as '' | 'M' | 'F',
  idade_valor: '', idade_unidade: '' as IdadeUnidade,
  nome_proprietario: '', tipo_atendimento: '',
  metodo_coleta: '', hora_protocolo: '',
  tipo_plantao: '' as TipoPlantao,
  desconto: '',
  exames: [] as string[],
};

const emptyEditForm = {
  nome_animal: '', raca: '', especie: '',
  sexo: '' as '' | 'M' | 'F',
  idade_valor: '', idade_unidade: '' as IdadeUnidade,
  nome_proprietario: '', tipo_atendimento: '',
  metodo_coleta: '', hora_protocolo: '',
  tipo_plantao: '' as TipoPlantao,
  desconto: '',
  exames: [] as string[],
};

function formatIdade(valor: number | null | undefined, unidade: string | null | undefined) {
  if (valor == null) return '—';
  return `${valor} ${unidade ?? ''}`.trim();
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Agrupa exames por categoria, excluindo a categoria Plantão (gerenciada pelo dropdown) */
function groupByCategoria(exames: Exame[]) {
  return exames
    .filter((e) => e.categoria !== 'Plantão')
    .reduce<Record<string, Exame[]>>((acc, e) => {
      const cat = e.categoria ?? 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(e);
      return acc;
    }, {});
}

/** Resumo estilo lista de compras */
function Resumo({
  examesAtivos,
  selecionados,
  onRemove,
  showValues,
}: {
  examesAtivos: Exame[];
  selecionados: string[];
  onRemove: (id: string) => void;
  showValues: boolean;
}) {
  const itens = examesAtivos.filter((e) => selecionados.includes(e.id));
  if (itens.length === 0) return null;

  const exames = itens.filter((e) => e.categoria !== 'Plantão');
  const plantao = itens.find((e) => e.categoria === 'Plantão');
  const total = itens.reduce((s, e) => s + Number(e.valor), 0);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-white">
        <ShoppingCart size={13} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumo do Pedido</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {exames.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-sm group">
            <span className="text-slate-700 flex-1">{e.nome}</span>
            {showValues && <span className="tabular-nums text-slate-600 font-medium">{fmt(Number(e.valor))}</span>}
            <button
              onClick={() => onRemove(e.id)}
              className="text-slate-300 hover:text-red-500 transition-colors ml-1 shrink-0"
              title="Remover"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {plantao && (
          <div className="flex items-center gap-2 text-sm pt-1 mt-1 border-t border-slate-200">
            <span className="flex items-center gap-1.5 text-amber-700 font-medium flex-1">
              <Moon size={11} />
              {plantao.nome}
            </span>
            {showValues && <span className="tabular-nums text-amber-700 font-semibold">{fmt(Number(plantao.valor))}</span>}
            <button
              onClick={() => onRemove(plantao.id)}
              className="text-amber-300 hover:text-red-500 transition-colors ml-1 shrink-0"
              title="Remover"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
      {showValues && (
        <div className="flex justify-between items-center px-3 py-2.5 border-t border-slate-200 bg-white">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-base font-bold text-brand-700 tabular-nums">{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

/** Seletor de exames estilo botão (sem a categoria Plantão) */
function ExameChecklist({
  examesAtivos,
  selecionados,
  onToggle,
  showValues,
}: {
  examesAtivos: Exame[];
  selecionados: string[];
  onToggle: (id: string) => void;
  showValues: boolean;
}) {
  const grouped = groupByCategoria(examesAtivos);
  const totalSelecionados = selecionados.filter((id) =>
    examesAtivos.some((e) => e.id === id && e.categoria !== 'Plantão')
  ).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {totalSelecionados > 0 && (
        <div className="px-3 py-1.5 bg-sky-500 flex items-center gap-1.5">
          <Check size={11} className="text-white" />
          <span className="text-xs font-semibold text-white">
            {totalSelecionados} exame{totalSelecionados > 1 ? 's' : ''} selecionado{totalSelecionados > 1 ? 's' : ''}
          </span>
        </div>
      )}
      <div className="max-h-64 overflow-y-auto">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{cat}</span>
            </div>
            {items.map((e) => {
              const selected = selecionados.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onToggle(e.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-0 transition-all duration-100
                    ${selected
                      ? 'bg-sky-50 border-l-2 border-l-sky-400'
                      : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}
                >
                  <div className={`w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 border-2 transition-all duration-100
                    ${selected ? 'bg-sky-500 border-sky-500 shadow-sm' : 'border-slate-300 bg-white'}`}>
                    {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm flex-1 transition-colors ${selected ? 'text-sky-700 font-semibold' : 'text-slate-700'}`}>
                    {e.nome}
                  </span>
                  {showValues && (
                    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full transition-colors
                      ${selected ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                      {fmt(Number(e.valor))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AtendimentosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showValues = user?.papel !== 'funcionario';
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [filters, setFilters] = useState({
    clinica_id: '', veterinario_id: '', protocolo: '', busca: '',
    mes: '', ano_filtro: '', tipo_plantao: '',
    data_inicio: '', data_fim: '',
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState<'detalhes' | 'historico' | 'laudos'>('detalhes');
  const [showLaudoModal, setShowLaudoModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const LIMIT = 50;

  function handleSort(col: string) {
    if (col === sortBy) {
      setSortOrder((o) => (o === 'DESC' ? 'ASC' : 'DESC'));
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (col !== sortBy) return <ChevronUp size={11} className="text-slate-300 ml-1 inline" />;
    return sortOrder === 'ASC'
      ? <ChevronUp size={11} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={11} className="text-blue-500 ml-1 inline" />;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['atendimentos', filters, page, sortBy, sortOrder],
    queryFn: () => api.get('/atendimentos', { params: { ...filters, limit: LIMIT, page, sort_by: sortBy, sort_order: sortOrder } }).then((r) => r.data),
  });

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-all'],
    queryFn: () => api.get('/clinicas', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const { data: vetsFilter } = useQuery<Veterinario[]>({
    queryKey: ['vets-filter', filters.clinica_id],
    queryFn: () =>
      api.get('/veterinarios', {
        params: { clinica_id: filters.clinica_id || undefined, limit: 200 },
      }).then((r) => r.data.data),
  });

  const { data: vets } = useQuery<Veterinario[]>({
    queryKey: ['vets-for-clinica', form.clinica_id],
    queryFn: () =>
      api.get('/veterinarios', { params: { clinica_id: form.clinica_id, limit: 100 } }).then((r) => r.data.data),
    enabled: !!form.clinica_id,
  });

  const { data: examesAtivos = [] } = useQuery<Exame[]>({
    queryKey: ['exames-ativos'],
    queryFn: () => api.get('/exames', { params: { ativos: 'true' } }).then((r) => r.data),
  });

  const { data: detalhe } = useQuery({
    queryKey: ['atendimento', showDetail],
    queryFn: () => api.get(`/atendimentos/${showDetail}`).then((r) => r.data),
    enabled: !!showDetail,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['atd-logs', showDetail],
    queryFn: () => api.get(`/atendimentos/${showDetail}/logs`).then((r) => r.data),
    enabled: !!showDetail && detailTab === 'historico',
  });

  const { data: laudos = [], isLoading: loadingLaudos } = useQuery<Laudo[]>({
    queryKey: ['laudos', showDetail],
    queryFn: () => api.get('/laudos', { params: { atendimento_id: showDetail } }).then((r) => r.data),
    enabled: !!showDetail && detailTab === 'laudos',
  });

  // IDs dos exames de plantão no catálogo
  const plantaoExame = useMemo(() => examesAtivos.find((e) => e.categoria === 'Plantão' && e.nome === 'Plantão'), [examesAtivos]);
  const plantaoEspecialExame = useMemo(() => examesAtivos.find((e) => e.categoria === 'Plantão' && e.nome === 'Plantão Especial'), [examesAtivos]);

  function aplicarPlantao(tipo: TipoPlantao, examesAtuais: string[]): string[] {
    const plantaoIds = examesAtivos.filter((e) => e.categoria === 'Plantão').map((e) => e.id);
    const semPlantao = examesAtuais.filter((id) => !plantaoIds.includes(id));
    if (tipo === 'plantao' && plantaoExame) return [...semPlantao, plantaoExame.id];
    if (tipo === 'plantao_especial' && plantaoEspecialExame) return [...semPlantao, plantaoEspecialExame.id];
    return semPlantao;
  }

  function inferirTipoPlantao(exameIds: string[]): TipoPlantao {
    if (plantaoEspecialExame && exameIds.includes(plantaoEspecialExame.id)) return 'plantao_especial';
    if (plantaoExame && exameIds.includes(plantaoExame.id)) return 'plantao';
    return '';
  }

  const criar = useMutation({
    mutationFn: (p: typeof form) =>
      api.post('/atendimentos', {
        clinica_id: p.clinica_id,
        veterinario_id: p.veterinario_id,
        especie: p.especie || undefined,
        sexo: p.sexo || undefined,
        tipo_atendimento: p.tipo_plantao === 'plantao' ? 'Plantão' :
                          p.tipo_plantao === 'plantao_especial' ? 'Plantão Especial' :
                          'Normal',
        nome_animal: p.nome_animal || undefined,
        raca: p.raca || undefined,
        idade_valor: p.idade_valor ? Number(p.idade_valor) : undefined,
        idade_unidade: p.idade_unidade || undefined,
        nome_proprietario: p.nome_proprietario || undefined,
        metodo_coleta: p.metodo_coleta || undefined,
        hora_protocolo: p.hora_protocolo || undefined,
        desconto: p.desconto ? Number(p.desconto) : 0,
        exames: p.exames.map((id) => ({ exame_id: id })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      toast('success', `Atendimento ${res.data.protocolo} registrado.`);
      closeForm();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao registrar atendimento');
    },
  });

  const atualizar = useMutation({
    mutationFn: ({ id, p }: { id: string; p: typeof editForm }) =>
      api.patch(`/atendimentos/${id}`, {
        especie: p.especie || undefined,
        sexo: p.sexo || undefined,
        tipo_atendimento: p.tipo_plantao === 'plantao' ? 'Plantão' :
                          p.tipo_plantao === 'plantao_especial' ? 'Plantão Especial' :
                          'Normal',
        nome_animal: p.nome_animal || undefined,
        raca: p.raca || undefined,
        idade_valor: p.idade_valor ? Number(p.idade_valor) : undefined,
        idade_unidade: p.idade_unidade || undefined,
        nome_proprietario: p.nome_proprietario || undefined,
        metodo_coleta: p.metodo_coleta || undefined,
        hora_protocolo: p.hora_protocolo || undefined,
        desconto: p.desconto !== '' ? Number(p.desconto) : undefined,
        ...(p.exames.length > 0 && { exames: p.exames.map((eid) => ({ exame_id: eid })) }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['atendimentos'] });
      qc.invalidateQueries({ queryKey: ['atendimento', id] });
      toast('success', 'Atendimento atualizado.');
      setEditMode(false);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao atualizar atendimento');
    },
  });

  function startEdit() {
    if (!detalhe) return;
    const exameIds = (detalhe.exames ?? []).map((e: { exame_id: string }) => e.exame_id);
    setEditForm({
      nome_animal: detalhe.nome_animal ?? '',
      raca: detalhe.raca ?? '',
      especie: detalhe.especie ?? '',
      sexo: (detalhe.sexo ?? '') as '' | 'M' | 'F',
      idade_valor: detalhe.idade_valor != null ? String(detalhe.idade_valor) : '',
      idade_unidade: (detalhe.idade_unidade ?? '') as IdadeUnidade,
      nome_proprietario: detalhe.nome_proprietario ?? '',
      tipo_atendimento: detalhe.tipo_atendimento ?? '',
      metodo_coleta: detalhe.metodo_coleta ?? '',
      hora_protocolo: detalhe.hora_protocolo ? detalhe.hora_protocolo.slice(0, 5) : '',
      tipo_plantao: inferirTipoPlantao(exameIds),
      desconto: detalhe.desconto != null && Number(detalhe.desconto) > 0 ? String(detalhe.desconto) : '',
      exames: exameIds,
    });
    setEditMode(true);
  }

  const plantaoIds = useMemo(() => examesAtivos.filter((e) => e.categoria === 'Plantão').map((e) => e.id), [examesAtivos]);

  function toggleExame(id: string) {
    setForm((p) => ({
      ...p,
      exames: p.exames.includes(id) ? p.exames.filter((x) => x !== id) : [...p.exames, id],
    }));
  }

  function removeExame(id: string) {
    setForm((p) => ({
      ...p,
      exames: p.exames.filter((x) => x !== id),
      ...(plantaoIds.includes(id) && { tipo_plantao: '' as TipoPlantao }),
    }));
  }

  function removeEditExame(id: string) {
    setEditForm((p) => ({
      ...p,
      exames: p.exames.filter((x) => x !== id),
      ...(plantaoIds.includes(id) && { tipo_plantao: '' as TipoPlantao }),
    }));
  }

  function toggleEditExame(id: string) {
    setEditForm((p) => ({
      ...p,
      exames: p.exames.includes(id) ? p.exames.filter((x) => x !== id) : [...p.exames, id],
    }));
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
  }

  const rows = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 rounded-xl bg-brand-600 px-5 py-3 flex items-center gap-3 text-white">
        <span className="text-lg">👋</span>
        <p className="text-sm font-medium">
          Bem-vindo de volta, <span className="font-semibold">{user?.nome}</span>!
        </p>
      </div>

      <div className="page-header">
        <h1>Atendimentos</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Novo Atendimento
        </button>
      </div>

      {/* Filtros */}
      {(() => {
        const hasActive = Object.values(filters).some(Boolean);
        return (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center">
                  <SlidersHorizontal size={13} className="text-brand-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</span>
                {hasActive && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </div>
              {hasActive && (
                <button
                  onClick={() => {
                    setFilters({ clinica_id: '', veterinario_id: '', protocolo: '', busca: '', mes: '', ano_filtro: '', tipo_plantao: '', data_inicio: '', data_fim: '' });
                    setPage(1);
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Buscar (animal, proprietário ou veterinário)</label>
                <input
                  className="input text-sm"
                  placeholder="Ex.: Thor, João Silva, Dra. Ana..."
                  value={filters.busca}
                  onChange={(e) => { setFilters((p) => ({ ...p, busca: e.target.value })); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Protocolo</label>
                <input
                  className="input text-sm"
                  placeholder="Ex.: P0001"
                  value={filters.protocolo}
                  onChange={(e) => { setFilters((p) => ({ ...p, protocolo: e.target.value })); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Clínica</label>
                <select className="input text-sm" value={filters.clinica_id}
                  onChange={(e) => { setFilters((p) => ({ ...p, clinica_id: e.target.value, veterinario_id: '' })); setPage(1); }}>
                  <option value="">Todas</option>
                  {(clinicas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Veterinário</label>
                <select className="input text-sm" value={filters.veterinario_id}
                  onChange={(e) => { setFilters((p) => ({ ...p, veterinario_id: e.target.value })); setPage(1); }}>
                  <option value="">Todos</option>
                  {(vetsFilter ?? []).map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Mês</label>
                <select className="input text-sm" value={filters.mes}
                  onChange={(e) => { setFilters((p) => ({ ...p, mes: e.target.value, data_inicio: '', data_fim: '' })); setPage(1); }}>
                  <option value="">Todos</option>
                  {MESES.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Ano</label>
                <select className="input text-sm" value={filters.ano_filtro}
                  onChange={(e) => { setFilters((p) => ({ ...p, ano_filtro: e.target.value })); setPage(1); }}>
                  <option value="">Todos</option>
                  {anos.map((a) => <option key={a} value={String(a)}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Data início</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={filters.data_inicio}
                  onChange={(e) => { setFilters((p) => ({ ...p, data_inicio: e.target.value, mes: '', ano_filtro: '' })); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Data fim</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={filters.data_fim}
                  onChange={(e) => { setFilters((p) => ({ ...p, data_fim: e.target.value, mes: '', ano_filtro: '' })); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Tipo de Plantão</label>
                <select className="input text-sm" value={filters.tipo_plantao}
                  onChange={(e) => { setFilters((p) => ({ ...p, tipo_plantao: e.target.value })); setPage(1); }}>
                  <option value="">Todos</option>
                  <option value="normal">Normal</option>
                  <option value="plantao">Plantão</option>
                  <option value="plantao_especial">Plantão Especial</option>
                </select>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="table-wrapper">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {([
                { label: 'Protocolo', col: 'protocolo' },
                { label: 'Clínica', col: 'clinica' },
                { label: 'Veterinário', col: 'veterinario' },
                { label: 'Animal', col: null },
                { label: 'Proprietário', col: null },
                ...(showValues ? [{ label: 'Valor Total', col: 'valor_total' }] : []),
                { label: 'Data', col: 'created_at' },
                { label: 'Hora', col: null },
                { label: '', col: null },
              ] as { label: string; col: string | null }[]).map(({ label, col }) => (
                <th key={label} className={`th${col ? ' cursor-pointer select-none hover:bg-slate-100' : ''}`}
                  onClick={col ? () => handleSort(col) : undefined}
                >
                  {label}{col && <SortIcon col={col} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTable rows={6} cols={9} />
            ) : isError ? (
              <tr>
                <td colSpan={showValues ? 9 : 8}>
                  <EmptyState
                    icon={<Activity size={22} />}
                    title="Erro ao carregar atendimentos"
                    description="Não foi possível conectar ao servidor. Verifique sua conexão ou faça login novamente."
                  />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showValues ? 9 : 8}>
                  <EmptyState
                    icon={<Activity size={22} />}
                    title="Nenhum atendimento encontrado"
                    description={Object.values(filters).some(Boolean) ? 'Nenhum resultado para os filtros aplicados.' : 'Registre o primeiro atendimento do sistema.'}
                    action={!Object.values(filters).some(Boolean) ? <button className="btn-primary" onClick={() => setShowForm(true)}>Novo Atendimento</button> : undefined}
                  />
                </td>
              </tr>
            ) : rows.map((a: Atendimento & { clinica_nome?: string; veterinario_nome?: string }) => (
              <tr key={a.id} className="tr">
                <td className="td"><span className="badge-blue font-mono text-xs">{a.protocolo}</span></td>
                <td className="td">{a.clinica_nome}</td>
                <td className="td">{a.veterinario_nome}</td>
                <td className="td">
                  <span>{a.nome_animal ?? '—'}</span>
                  {a.especie && <span className="text-slate-400 text-xs ml-1">({a.especie})</span>}
                </td>
                <td className="td">{a.nome_proprietario ?? '—'}</td>
                {showValues && <td className="td font-semibold tabular-nums text-slate-900">{fmt(Number(a.valor_total))}</td>}
                <td className="td text-slate-500">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="td text-slate-500 tabular-nums">{a.hora_protocolo ? a.hora_protocolo.slice(0, 5) : '—'}</td>
                <td className="td">
                  <button className="btn-ghost px-2 py-1 text-xs flex items-center gap-1" onClick={() => setShowDetail(a.id)}>
                    <Eye size={12} /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ── */}
      {data && data.total > LIMIT && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-slate-500">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, data.total)} de {data.total.toLocaleString('pt-BR')} atendimentos
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-600 font-medium">
              Página {page} de {Math.ceil(data.total / LIMIT)}
            </span>
            <button
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
              disabled={page * LIMIT >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* ── Novo Atendimento ── */}
      <Modal open={showForm} onClose={closeForm} title="Novo Atendimento" width="max-w-lg">
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <div>
            <label className="label">Clínica</label>
            <select className="input" value={form.clinica_id}
              onChange={(e) => setForm((p) => ({ ...p, clinica_id: e.target.value, veterinario_id: '' }))}>
              <option value="">Selecione...</option>
              {(clinicas ?? []).filter((c) => c.status === 'ativo').map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Veterinário</label>
            <select className="input" value={form.veterinario_id} disabled={!form.clinica_id}
              onChange={(e) => setForm((p) => ({ ...p, veterinario_id: e.target.value }))}>
              <option value="">Selecione...</option>
              {(vets ?? []).filter((v) => v.status === 'ativo').map((v) => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome do Proprietário</label>
              <input className="input" placeholder="Ex.: João Silva" maxLength={200} value={form.nome_proprietario}
                onChange={(e) => setForm((p) => ({ ...p, nome_proprietario: e.target.value }))} />
            </div>
            <div>
              <label className="label">Hora do Protocolo</label>
              <input className="input" type="time" value={form.hora_protocolo}
                onChange={(e) => setForm((p) => ({ ...p, hora_protocolo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Método de Coleta</label>
            <select className="input" value={form.metodo_coleta}
              onChange={(e) => setForm((p) => ({ ...p, metodo_coleta: e.target.value }))}>
              <option value="">Selecione...</option>
              {METODOS_COLETA.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome do Animal</label>
              <input className="input" placeholder="Ex.: Thor" maxLength={100} value={form.nome_animal}
                onChange={(e) => setForm((p) => ({ ...p, nome_animal: e.target.value }))} />
            </div>
            <div>
              <label className="label">Raça</label>
              <input className="input" placeholder="Ex.: Golden Retriever" maxLength={100} value={form.raca}
                onChange={(e) => setForm((p) => ({ ...p, raca: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Espécie</label>
              <input className="input" placeholder="Ex.: Canino" maxLength={50} value={form.especie}
                onChange={(e) => setForm((p) => ({ ...p, especie: e.target.value }))} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select className="input" value={form.sexo}
                onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value as '' | 'M' | 'F' }))}>
                <option value="">—</option>
                <option value="M">Macho</option>
                <option value="F">Fêmea</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Idade</label>
              <input className="input" type="number" min="0" placeholder="Ex.: 6" value={form.idade_valor}
                onChange={(e) => setForm((p) => ({ ...p, idade_valor: e.target.value }))} />
            </div>
            <div>
              <label className="label">Unidade</label>
              <select className="input" value={form.idade_unidade}
                onChange={(e) => setForm((p) => ({ ...p, idade_unidade: e.target.value as IdadeUnidade }))}>
                <option value="">—</option>
                <option value="dias">Dias</option>
                <option value="meses">Meses</option>
                <option value="anos">Anos</option>
              </select>
            </div>
          </div>

          {/* Tipo de Plantão */}
          <div>
            <label className="label">Tipo de Atendimento</label>
            <select
              className="input"
              value={form.tipo_plantao}
              onChange={(e) => {
                const tipo = e.target.value as TipoPlantao;
                setForm((p) => ({
                  ...p,
                  tipo_plantao: tipo,
                  exames: aplicarPlantao(tipo, p.exames),
                }));
              }}
            >
              <option value="">Atendimento Normal</option>
              <option value="plantao">Atendimento de Plantão{showValues && plantaoExame ? ` — ${fmt(Number(plantaoExame.valor))}` : ''}</option>
              <option value="plantao_especial">Atendimento de Plantão Especial{showValues && plantaoEspecialExame ? ` — ${fmt(Number(plantaoEspecialExame.valor))}` : ''}</option>
            </select>
          </div>

          {/* Exames */}
          <div>
            <label className="label">Exames</label>
            <ExameChecklist examesAtivos={examesAtivos} selecionados={form.exames} onToggle={toggleExame} showValues={showValues} />
          </div>

          {/* Resumo */}
          <Resumo examesAtivos={examesAtivos} selecionados={form.exames} onRemove={removeExame} showValues={showValues} />

          {showValues && (
            <div>
              <label className="label">Desconto (R$)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.desconto}
                onChange={(e) => setForm((p) => ({ ...p, desconto: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button className="btn-secondary" onClick={closeForm}>Cancelar</button>
          <button className="btn-primary" onClick={() => criar.mutate(form)} disabled={criar.isPending}>
            {criar.isPending ? 'Registrando...' : 'Registrar Atendimento'}
          </button>
        </div>
      </Modal>

      {/* ── Detalhe / Edição ── */}
      {showDetail && detalhe && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !editMode) { setShowDetail(null); setDetailTab('detalhes'); } }}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Atendimento</h2>
                <span className="badge-blue font-mono text-xs mt-1 inline-block">{detalhe.protocolo}</span>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5" onClick={startEdit}>
                    <Pencil size={12} /> Editar
                  </button>
                )}
                <button
                  className="btn-ghost w-8 h-8 p-0 flex items-center justify-center"
                  onClick={() => { setShowDetail(null); setEditMode(false); setDetailTab('detalhes'); }}
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!editMode && (
              <div className="flex border-b border-slate-100 shrink-0 px-6">
                {(['detalhes', 'historico', 'laudos'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors -mb-px ${
                      detailTab === tab
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'detalhes' ? 'Detalhes' : tab === 'historico' ? 'Histórico' : 'Laudos'}
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 py-4 overflow-y-auto">
              {detailTab === 'laudos' && !editMode ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Laudos do Atendimento</span>
                    <button
                      className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
                      onClick={() => setShowLaudoModal(true)}
                    >
                      <Plus size={12} /> Novo Laudo
                    </button>
                  </div>
                  {loadingLaudos ? (
                    <p className="text-sm text-slate-400 text-center py-6">Carregando laudos...</p>
                  ) : laudos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <FileText size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum laudo registrado</p>
                      <p className="text-xs mt-1">Clique em "Novo Laudo" para criar o primeiro.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {laudos.map((laudo) => (
                        <button
                          key={laudo.id}
                          onClick={() => navigate(`/laudos/${laudo.id}`)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                        >
                          <FileText size={16} className="text-brand-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {LAUDO_REGISTRY[laudo.tipo]?.label ?? laudo.tipo}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(laudo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                            laudo.status === 'assinado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {laudo.status === 'assinado' ? 'Assinado' : 'Rascunho'}
                          </span>
                          <ExternalLink size={13} className="text-slate-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : detailTab === 'historico' && !editMode ? (
                <div className="space-y-4">
                  {loadingLogs ? (
                    <p className="text-sm text-slate-400 text-center py-6">Carregando histórico...</p>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Sem registros de alteração.</p>
                  ) : (
                    <ol className="relative border-l border-slate-200 ml-3 space-y-5">
                      {(logs as { id: string; usuario_nome: string; acao: string; campos_alterados: string | null; created_at: string }[]).map((log) => {
                        const dt = new Date(log.created_at);
                        const label = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const isCriado = log.acao === 'criado';
                        return (
                          <li key={log.id} className="ml-5">
                            <span className={`absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${isCriado ? 'bg-emerald-500' : 'bg-brand-500'}`}>
                              {isCriado
                                ? <span className="text-white text-[9px] font-bold">✓</span>
                                : <span className="text-white text-[9px]">✎</span>
                              }
                            </span>
                            <p className="text-sm font-medium text-slate-800">
                              {isCriado ? 'Criado por' : 'Editado por'}{' '}
                              <span className="font-semibold">{log.usuario_nome}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                            {log.campos_alterados && (
                              <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded px-2 py-1">
                                Alterou: {log.campos_alterados}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              ) : (
              <>
              {/* Campos fixos */}
              <dl className="space-y-2.5 text-sm mb-4">
                {[
                  { label: 'Clínica', value: detalhe.clinica_nome },
                  { label: 'Veterinário', value: `${detalhe.veterinario_nome} (${detalhe.veterinario_crmv})` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
                    <dd className="text-slate-800 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              {editMode ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Nome do Proprietário</label>
                      <input className="input" value={editForm.nome_proprietario}
                        onChange={(e) => setEditForm((p) => ({ ...p, nome_proprietario: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Hora do Protocolo</label>
                      <input className="input" type="time" value={editForm.hora_protocolo}
                        onChange={(e) => setEditForm((p) => ({ ...p, hora_protocolo: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Método de Coleta</label>
                    <select className="input" value={editForm.metodo_coleta}
                      onChange={(e) => setEditForm((p) => ({ ...p, metodo_coleta: e.target.value }))}>
                      <option value="">Selecione...</option>
                      {METODOS_COLETA.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Nome do Animal</label>
                      <input className="input" value={editForm.nome_animal}
                        onChange={(e) => setEditForm((p) => ({ ...p, nome_animal: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Raça</label>
                      <input className="input" value={editForm.raca}
                        onChange={(e) => setEditForm((p) => ({ ...p, raca: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Espécie</label>
                      <input className="input" value={editForm.especie}
                        onChange={(e) => setEditForm((p) => ({ ...p, especie: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Sexo</label>
                      <select className="input" value={editForm.sexo}
                        onChange={(e) => setEditForm((p) => ({ ...p, sexo: e.target.value as '' | 'M' | 'F' }))}>
                        <option value="">—</option>
                        <option value="M">Macho</option>
                        <option value="F">Fêmea</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Idade</label>
                      <input className="input" type="number" min="0" value={editForm.idade_valor}
                        onChange={(e) => setEditForm((p) => ({ ...p, idade_valor: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Unidade</label>
                      <select className="input" value={editForm.idade_unidade}
                        onChange={(e) => setEditForm((p) => ({ ...p, idade_unidade: e.target.value as IdadeUnidade }))}>
                        <option value="">—</option>
                        <option value="dias">Dias</option>
                        <option value="meses">Meses</option>
                        <option value="anos">Anos</option>
                      </select>
                    </div>
                  </div>

                  {/* Tipo de Plantão — edição */}
                  <div>
                    <label className="label">Tipo de Atendimento</label>
                    <select
                      className="input"
                      value={editForm.tipo_plantao}
                      onChange={(e) => {
                        const tipo = e.target.value as TipoPlantao;
                        setEditForm((p) => ({
                          ...p,
                          tipo_plantao: tipo,
                          exames: aplicarPlantao(tipo, p.exames),
                        }));
                      }}
                    >
                      <option value="">Atendimento Normal</option>
                      <option value="plantao">Atendimento de Plantão{showValues && plantaoExame ? ` — ${fmt(Number(plantaoExame.valor))}` : ''}</option>
                      <option value="plantao_especial">Atendimento de Plantão Especial{showValues && plantaoEspecialExame ? ` — ${fmt(Number(plantaoEspecialExame.valor))}` : ''}</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Exames</label>
                    <ExameChecklist examesAtivos={examesAtivos} selecionados={editForm.exames} onToggle={toggleEditExame} showValues={showValues} />
                  </div>

                  <Resumo examesAtivos={examesAtivos} selecionados={editForm.exames} onRemove={removeEditExame} showValues={showValues} />

                  {showValues && (
                    <div>
                      <label className="label">Desconto (R$)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={editForm.desconto}
                        onChange={(e) => setEditForm((p) => ({ ...p, desconto: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 justify-end">
                    <button className="btn-secondary" onClick={() => setEditMode(false)}>Cancelar</button>
                    <button
                      className="btn-primary flex items-center gap-1.5"
                      onClick={() => showDetail && atualizar.mutate({ id: showDetail, p: editForm })}
                      disabled={atualizar.isPending}
                    >
                      <Check size={13} />
                      {atualizar.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="space-y-2.5 text-sm">
                    {[
                      { label: 'Proprietário', value: detalhe.nome_proprietario ?? '—' },
                      { label: 'Hora Protocolo', value: detalhe.hora_protocolo ? detalhe.hora_protocolo.slice(0, 5) : '—' },
                      { label: 'Método de Coleta', value: detalhe.metodo_coleta ?? '—' },
                      { label: 'Animal', value: detalhe.nome_animal ?? '—' },
                      { label: 'Raça', value: detalhe.raca ?? '—' },
                      { label: 'Espécie', value: detalhe.especie ?? '—' },
                      { label: 'Sexo', value: detalhe.sexo ?? '—' },
                      { label: 'Idade', value: formatIdade(detalhe.idade_valor, detalhe.idade_unidade) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-3">
                        <dt className="text-slate-500 w-32 shrink-0">{label}</dt>
                        <dd className="text-slate-800 font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {/* Resumo do pedido — view mode */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo do Pedido</p>
                    <div className="space-y-1.5">
                      {(detalhe.exames ?? [])
                        .filter((e: { exame_nome: string; exame_categoria?: string }) => e.exame_categoria !== 'Plantão')
                        .map((e: { id: string; exame_nome: string; valor: number }) => (
                          <div key={e.id} className="flex justify-between text-sm">
                            <span className="text-slate-700">{e.exame_nome}</span>
                            {showValues && <span className="font-medium tabular-nums">{fmt(Number(e.valor))}</span>}
                          </div>
                        ))}
                      {(detalhe.exames ?? [])
                        .filter((e: { exame_categoria?: string }) => e.exame_categoria === 'Plantão')
                        .map((e: { id: string; exame_nome: string; valor: number }) => (
                          <div key={e.id} className="flex justify-between text-sm pt-1 mt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                              <Moon size={11} />{e.exame_nome}
                            </span>
                            {showValues && <span className="font-semibold tabular-nums text-amber-700">{fmt(Number(e.valor))}</span>}
                          </div>
                        ))}
                    </div>
                    {showValues && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {Number(detalhe.desconto) > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Desconto</span>
                            <span className="tabular-nums">- {fmt(Number(detalhe.desconto))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span className="text-brand-700 tabular-nums">{fmt(Number(detalhe.valor_total))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal — seleção de tipo de laudo */}
      {showLaudoModal && detalhe && (
        <Modal
          open={showLaudoModal}
          onClose={() => setShowLaudoModal(false)}
          title="Novo Laudo"
          width="max-w-lg"
        >
          {(() => {
            const sugestoes: LaudoSugestao[] = sugerirLaudoTipos(detalhe as Atendimento);
            const sugestoesTipos = new Set(sugestoes.map((s) => s.tipo));

            const grupos = Object.entries(LAUDO_REGISTRY).reduce<
              Record<string, Array<[string, (typeof LAUDO_REGISTRY)[string]]>>
            >((acc, [key, entry]) => {
              const cat = key.split('_')[0];
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push([key, entry]);
              return acc;
            }, {});

            return (
              <div className="space-y-5">
                {sugestoes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Sugerido com base nos exames
                    </p>
                    <div className="space-y-1.5">
                      {sugestoes.map((s) => (
                        <button
                          key={s.tipo}
                          onClick={() => {
                            navigate(`/laudos/novo?atendimento_id=${showDetail}&tipo=${s.tipo}`);
                            setShowLaudoModal(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 hover:border-brand-400 transition-all text-left"
                        >
                          <FileText size={15} className="text-brand-500 shrink-0" />
                          <span className="text-sm font-medium text-brand-800">
                            {LAUDO_REGISTRY[s.tipo]?.label ?? s.tipo}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {sugestoes.length > 0 ? 'Outros laudos' : 'Selecione o tipo de laudo'}
                  </p>
                  <div className="space-y-3">
                    {Object.entries(grupos).map(([cat, entries]) => (
                      <div key={cat}>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                          {CATEGORIA_LABEL[cat] ?? cat}
                        </p>
                        <div className="space-y-1">
                          {entries
                            .filter(([key]) => !sugestoesTipos.has(key))
                            .map(([key, entry]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  navigate(`/laudos/novo?atendimento_id=${showDetail}&tipo=${key}`);
                                  setShowLaudoModal(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-left"
                              >
                                <FileText size={13} className="text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-700">{entry.label}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
