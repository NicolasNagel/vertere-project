import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Atendimento, Clinica, Veterinario, Exame } from '../types';
import { Plus, Eye, Activity, X, Pencil, Check, ShoppingCart, Moon, SlidersHorizontal } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

type IdadeUnidade = '' | 'dias' | 'meses' | 'anos';
type TipoPlantao = '' | 'plantao' | 'plantao_especial';

const PLANTAO_NOME: Record<TipoPlantao, string> = {
  '': 'Atendimento Normal',
  plantao: 'Atendimento de Plantão',
  plantao_especial: 'Atendimento de Plantão Especial',
};

const METODOS_COLETA = [
  'Coleta Venosa', 'Coleta Urinária', 'Swab', 'Raspado Cutâneo',
  'Fezes', 'Líquido Cefalorraquidiano', 'Líquido Sinovial', 'Outro',
];

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
  metodo_coleta: '',
  tipo_plantao: '' as TipoPlantao,
  exames: [] as string[],
};

const emptyEditForm = {
  nome_animal: '', raca: '', especie: '',
  sexo: '' as '' | 'M' | 'F',
  idade_valor: '', idade_unidade: '' as IdadeUnidade,
  nome_proprietario: '', tipo_atendimento: '',
  metodo_coleta: '',
  tipo_plantao: '' as TipoPlantao,
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
}: {
  examesAtivos: Exame[];
  selecionados: string[];
  onRemove: (id: string) => void;
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
            <span className="tabular-nums text-slate-600 font-medium">{fmt(Number(e.valor))}</span>
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
            <span className="tabular-nums text-amber-700 font-semibold">{fmt(Number(plantao.valor))}</span>
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
      <div className="flex justify-between items-center px-3 py-2.5 border-t border-slate-200 bg-white">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-base font-bold text-brand-700 tabular-nums">{fmt(total)}</span>
      </div>
    </div>
  );
}

/** Seletor de exames estilo botão (sem a categoria Plantão) */
function ExameChecklist({
  examesAtivos,
  selecionados,
  onToggle,
}: {
  examesAtivos: Exame[];
  selecionados: string[];
  onToggle: (id: string) => void;
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
                  <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full transition-colors
                    ${selected ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                    {fmt(Number(e.valor))}
                  </span>
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
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const [filters, setFilters] = useState({
    clinica_id: '', protocolo: '', mes: '', ano_filtro: '', tipo_plantao: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const { data, isLoading } = useQuery({
    queryKey: ['atendimentos', filters],
    queryFn: () => api.get('/atendimentos', { params: { ...filters, limit: 50 } }).then((r) => r.data),
  });

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-all'],
    queryFn: () => api.get('/clinicas', { params: { limit: 200 } }).then((r) => r.data.data),
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
        tipo_atendimento: p.tipo_atendimento || undefined,
        nome_animal: p.nome_animal || undefined,
        raca: p.raca || undefined,
        idade_valor: p.idade_valor ? Number(p.idade_valor) : undefined,
        idade_unidade: p.idade_unidade || undefined,
        nome_proprietario: p.nome_proprietario || undefined,
        metodo_coleta: p.metodo_coleta || undefined,
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
        tipo_atendimento: p.tipo_atendimento || undefined,
        nome_animal: p.nome_animal || undefined,
        raca: p.raca || undefined,
        idade_valor: p.idade_valor ? Number(p.idade_valor) : undefined,
        idade_unidade: p.idade_unidade || undefined,
        nome_proprietario: p.nome_proprietario || undefined,
        metodo_coleta: p.metodo_coleta || undefined,
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
      tipo_plantao: inferirTipoPlantao(exameIds),
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
                  onClick={() => setFilters({ clinica_id: '', protocolo: '', mes: '', ano_filtro: '', tipo_plantao: '' })}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X size={11} /> Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Protocolo</label>
                <input
                  className="input text-sm"
                  placeholder="Ex.: P0001"
                  value={filters.protocolo}
                  onChange={(e) => setFilters((p) => ({ ...p, protocolo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Clínica</label>
                <select className="input text-sm" value={filters.clinica_id}
                  onChange={(e) => setFilters((p) => ({ ...p, clinica_id: e.target.value }))}>
                  <option value="">Todas</option>
                  {(clinicas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Mês</label>
                <select className="input text-sm" value={filters.mes}
                  onChange={(e) => setFilters((p) => ({ ...p, mes: e.target.value }))}>
                  <option value="">Todos</option>
                  {MESES.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Ano</label>
                <select className="input text-sm" value={filters.ano_filtro}
                  onChange={(e) => setFilters((p) => ({ ...p, ano_filtro: e.target.value }))}>
                  <option value="">Todos</option>
                  {anos.map((a) => <option key={a} value={String(a)}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Tipo de Plantão</label>
                <select className="input text-sm" value={filters.tipo_plantao}
                  onChange={(e) => setFilters((p) => ({ ...p, tipo_plantao: e.target.value }))}>
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
              {['Protocolo', 'Clínica', 'Veterinário', 'Animal', 'Proprietário', 'Valor Total', 'Data', ''].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTable rows={6} cols={8} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={<Activity size={22} />}
                    title="Nenhum atendimento registrado"
                    description="Registre o primeiro atendimento do sistema."
                    action={<button className="btn-primary" onClick={() => setShowForm(true)}>Novo Atendimento</button>}
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
                <td className="td font-semibold tabular-nums text-slate-900">{fmt(Number(a.valor_total))}</td>
                <td className="td text-slate-500">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
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
              <input className="input" placeholder="Ex.: João Silva" value={form.nome_proprietario}
                onChange={(e) => setForm((p) => ({ ...p, nome_proprietario: e.target.value }))} />
            </div>
            <div>
              <label className="label">Método de Coleta</label>
              <select className="input" value={form.metodo_coleta}
                onChange={(e) => setForm((p) => ({ ...p, metodo_coleta: e.target.value }))}>
                <option value="">Selecione...</option>
                {METODOS_COLETA.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome do Animal</label>
              <input className="input" placeholder="Ex.: Thor" value={form.nome_animal}
                onChange={(e) => setForm((p) => ({ ...p, nome_animal: e.target.value }))} />
            </div>
            <div>
              <label className="label">Raça</label>
              <input className="input" placeholder="Ex.: Golden Retriever" value={form.raca}
                onChange={(e) => setForm((p) => ({ ...p, raca: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Espécie</label>
              <input className="input" placeholder="Ex.: Canino" value={form.especie}
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
              <option value="plantao">Atendimento de Plantão — {plantaoExame ? fmt(Number(plantaoExame.valor)) : 'R$ 100,00'}</option>
              <option value="plantao_especial">Atendimento de Plantão Especial — {plantaoEspecialExame ? fmt(Number(plantaoEspecialExame.valor)) : 'R$ 150,00'}</option>
            </select>
          </div>

          {/* Exames */}
          <div>
            <label className="label">Exames</label>
            <ExameChecklist examesAtivos={examesAtivos} selecionados={form.exames} onToggle={toggleExame} />
          </div>

          {/* Resumo */}
          <Resumo examesAtivos={examesAtivos} selecionados={form.exames} onRemove={removeExame} />
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
          onClick={(e) => { if (e.target === e.currentTarget && !editMode) setShowDetail(null); }}
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
                  onClick={() => { setShowDetail(null); setEditMode(false); }}
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto">
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
                      <label className="label">Método de Coleta</label>
                      <select className="input" value={editForm.metodo_coleta}
                        onChange={(e) => setEditForm((p) => ({ ...p, metodo_coleta: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {METODOS_COLETA.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
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
                      <option value="plantao">Atendimento de Plantão — {plantaoExame ? fmt(Number(plantaoExame.valor)) : 'R$ 100,00'}</option>
                      <option value="plantao_especial">Atendimento de Plantão Especial — {plantaoEspecialExame ? fmt(Number(plantaoEspecialExame.valor)) : 'R$ 150,00'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Exames</label>
                    <ExameChecklist examesAtivos={examesAtivos} selecionados={editForm.exames} onToggle={toggleEditExame} />
                  </div>

                  <Resumo examesAtivos={examesAtivos} selecionados={editForm.exames} onRemove={removeEditExame} />

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
                            <span className="font-medium tabular-nums">{fmt(Number(e.valor))}</span>
                          </div>
                        ))}
                      {(detalhe.exames ?? [])
                        .filter((e: { exame_categoria?: string }) => e.exame_categoria === 'Plantão')
                        .map((e: { id: string; exame_nome: string; valor: number }) => (
                          <div key={e.id} className="flex justify-between text-sm pt-1 mt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                              <Moon size={11} />{e.exame_nome}
                            </span>
                            <span className="font-semibold tabular-nums text-amber-700">{fmt(Number(e.valor))}</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-brand-700 tabular-nums">{fmt(Number(detalhe.valor_total))}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
