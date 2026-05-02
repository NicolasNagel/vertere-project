import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Clinica } from '../types';
import { Plus, Search, Building2, PowerOff, Power } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export default function ClinicasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Clinica | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Clinica | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });

  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['clinicas', search, page],
    queryFn: () => api.get('/clinicas', { params: { search, page, limit: LIMIT } }).then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (payload: typeof form) =>
      editTarget ? api.patch(`/clinicas/${editTarget.id}`, payload) : api.post('/clinicas', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinicas'] });
      toast('success', editTarget ? 'Clínica atualizada.' : 'Clínica criada.');
      closeForm();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao salvar');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) =>
      api.patch(`/clinicas/${id}/status`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['clinicas'] });
      toast('success', status === 'inativo' ? 'Clínica inativada.' : 'Clínica reativada.');
      setConfirmToggle(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao alterar status');
      setConfirmToggle(null);
    },
  });

  function openForm(c?: Clinica) {
    setEditTarget(c ?? null);
    setForm(c
      ? { nome: c.nome, cnpj: c.cnpj, endereco: c.endereco ?? '', telefone: c.telefone ?? '', email: c.email ?? '' }
      : { nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  const rows = data?.data ?? [];

  const fieldLabels: Record<string, string> = {
    nome: 'Nome', cnpj: 'CNPJ', endereco: 'Endereço', telefone: 'Telefone', email: 'E-mail',
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clínicas</h1>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={15} /> Nova Clínica
        </button>
      </div>

      <div className="relative mb-5 w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          className="input pl-9"
          placeholder="Buscar clínica..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="table-wrapper">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Nome', 'CNPJ', 'Telefone', 'E-mail', 'Status', ''].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Building2 size={22} />}
                    title="Nenhuma clínica encontrada"
                    description="Crie a primeira clínica para começar."
                    action={<button className="btn-primary" onClick={() => openForm()}>Nova Clínica</button>}
                  />
                </td>
              </tr>
            ) : rows.map((c: Clinica) => (
              <tr key={c.id} className="tr">
                <td className="td font-medium text-slate-900">{c.nome}</td>
                <td className="td font-mono text-xs">{c.cnpj}</td>
                <td className="td">{c.telefone ?? '—'}</td>
                <td className="td">{c.email ?? '—'}</td>
                <td className="td">
                  <span className={c.status === 'ativo' ? 'badge-green' : 'badge-gray'}>
                    {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openForm(c)}>Editar</button>
                    <button
                      className={`btn-ghost px-2 py-1 text-xs flex items-center gap-1 ${
                        c.status === 'ativo' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                      }`}
                      onClick={() => setConfirmToggle(c)}
                    >
                      {c.status === 'ativo'
                        ? <><PowerOff size={11} /> Inativar</>
                        : <><Power size={11} /> Ativar</>
                      }
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > LIMIT && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-slate-500">
            {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, data.total)} de {data.total.toLocaleString('pt-BR')} clínicas
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

      {confirmToggle && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmToggle(null)}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              {confirmToggle.status === 'ativo' ? 'Inativar clínica?' : 'Reativar clínica?'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {confirmToggle.status === 'ativo'
                ? <>A clínica <strong>{confirmToggle.nome}</strong> ficará indisponível para novos atendimentos.</>
                : <>A clínica <strong>{confirmToggle.nome}</strong> voltará a estar disponível para atendimentos.</>
              }
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="btn-secondary"
                onClick={() => setConfirmToggle(null)}
                disabled={toggleStatus.isPending}
              >
                Cancelar
              </button>
              <button
                className={confirmToggle.status === 'ativo'
                  ? 'btn-primary bg-red-600 hover:bg-red-700 border-red-600'
                  : 'btn-primary bg-green-600 hover:bg-green-700 border-green-600'
                }
                onClick={() => toggleStatus.mutate({
                  id: confirmToggle.id,
                  status: confirmToggle.status === 'ativo' ? 'inativo' : 'ativo',
                })}
                disabled={toggleStatus.isPending}
              >
                {toggleStatus.isPending
                  ? 'Aguarde...'
                  : confirmToggle.status === 'ativo' ? 'Inativar' : 'Reativar'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editTarget ? 'Editar Clínica' : 'Nova Clínica'}
      >
        <div className="space-y-4">
          {(['nome', 'cnpj', 'endereco', 'telefone', 'email'] as const).map((f) => (
            <div key={f}>
              <label className="label">{fieldLabels[f]}</label>
              <input
                className="input"
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-6 justify-end">
          <button className="btn-secondary" onClick={closeForm}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => upsert.mutate(form)}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
