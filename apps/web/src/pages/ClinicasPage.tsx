import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Clinica } from '../types';
import { Plus, Search, Building2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export default function ClinicasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Clinica | null>(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', email: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['clinicas', search],
    queryFn: () => api.get('/clinicas', { params: { search } }).then((r) => r.data),
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
    mutationFn: (c: Clinica) =>
      api.patch(`/clinicas/${c.id}/status`, { status: c.status === 'ativo' ? 'inativo' : 'ativo' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinicas'] });
      toast('success', 'Status atualizado.');
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
          onChange={(e) => setSearch(e.target.value)}
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
                  <div className="flex gap-2">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openForm(c)}>Editar</button>
                    <button
                      className="btn-ghost px-2 py-1 text-xs text-slate-500"
                      onClick={() => toggleStatus.mutate(c)}
                      disabled={toggleStatus.isPending}
                    >
                      {c.status === 'ativo' ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
