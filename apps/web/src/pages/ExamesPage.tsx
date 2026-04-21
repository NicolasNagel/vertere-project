import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Exame } from '../types';
import { Plus, FlaskConical } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

const CATEGORIAS = [
  'Perfis',
  'Exames Hematológicos',
  'Exames Bioquímicos',
  'Exames Urinários',
  'Hemogasometria',
  'Exames Coproparasitológicos',
  'Plantão',
];

export default function ExamesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Exame | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [form, setForm] = useState({ nome: '', descricao: '', valor: '', categoria: '' });

  const { data: exames, isLoading } = useQuery<Exame[]>({
    queryKey: ['exames'],
    queryFn: () => api.get('/exames').then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (payload: { nome: string; descricao?: string; valor: number; categoria?: string }) =>
      editTarget ? api.patch(`/exames/${editTarget.id}`, payload) : api.post('/exames', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exames'] });
      qc.invalidateQueries({ queryKey: ['exames-ativos'] });
      toast('success', editTarget ? 'Exame atualizado.' : 'Exame criado.');
      closeForm();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao salvar');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (e: Exame) =>
      api.patch(`/exames/${e.id}`, { status: e.status === 'ativo' ? 'inativo' : 'ativo' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exames'] });
      qc.invalidateQueries({ queryKey: ['exames-ativos'] });
      toast('success', 'Status atualizado.');
    },
  });

  function openForm(e?: Exame) {
    setEditTarget(e ?? null);
    setForm(e
      ? { nome: e.nome, descricao: e.descricao ?? '', valor: String(e.valor), categoria: e.categoria ?? '' }
      : { nome: '', descricao: '', valor: '', categoria: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  const allRows = exames ?? [];
  const filtered = categoriaFiltro
    ? allRows.filter((e) => e.categoria === categoriaFiltro)
    : allRows;

  // Group by categoria
  const grouped = filtered.reduce<Record<string, Exame[]>>((acc, e) => {
    const cat = e.categoria ?? 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {});

  const categoryOrder = [...CATEGORIAS, 'Sem categoria'];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div>
      <div className="page-header">
        <h1>Catálogo de Exames</h1>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={15} /> Novo Exame
        </button>
      </div>

      <div className="mb-5 w-64">
        <select
          className="input"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="table-wrapper">
          <table className="w-full">
            <tbody><SkeletonTable rows={8} cols={5} /></tbody>
          </table>
        </div>
      ) : allRows.length === 0 ? (
        <div className="table-wrapper">
          <EmptyState
            icon={<FlaskConical size={22} />}
            title="Nenhum exame cadastrado"
            description="Adicione exames ao catálogo para usá-los nos atendimentos."
            action={<button className="btn-primary" onClick={() => openForm()}>Novo Exame</button>}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((cat) => (
            <div key={cat} className="table-wrapper">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</h2>
              </div>
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    {['Nome', 'Descrição', 'Valor (R$)', 'Status', ''].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grouped[cat].map((e) => (
                    <tr key={e.id} className="tr">
                      <td className="td font-medium text-slate-900">{e.nome}</td>
                      <td className="td text-slate-500 max-w-xs truncate">{e.descricao ?? '—'}</td>
                      <td className="td font-medium tabular-nums">
                        {Number(e.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="td">
                        <span className={e.status === 'ativo' ? 'badge-green' : 'badge-gray'}>
                          {e.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex gap-2">
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openForm(e)}>Editar</button>
                          <button
                            className={`btn-ghost px-2 py-1 text-xs ${e.status === 'ativo' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            onClick={() => toggleStatus.mutate(e)}
                            disabled={toggleStatus.isPending}
                          >
                            {e.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editTarget ? 'Editar Exame' : 'Novo Exame'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={form.categoria}
              onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.valor}
              onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <button className="btn-secondary" onClick={closeForm}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => upsert.mutate({
              nome: form.nome,
              descricao: form.descricao || undefined,
              valor: parseFloat(form.valor),
              categoria: form.categoria || undefined,
            })}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
