import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Veterinario, Clinica } from '../types';
import { Plus, Stethoscope, PowerOff, Power } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

export default function VeterinariosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [clinicaFiltro, setClinicaFiltro] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Veterinario | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Veterinario | null>(null);
  const [form, setForm] = useState({ clinica_id: '', nome: '', crmv: '', telefone: '', email: '' });

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-all'],
    queryFn: () => api.get('/clinicas', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['veterinarios', clinicaFiltro],
    queryFn: () =>
      api.get('/veterinarios', { params: { clinica_id: clinicaFiltro || undefined, limit: 100 } }).then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (payload: typeof form) =>
      editTarget ? api.patch(`/veterinarios/${editTarget.id}`, payload) : api.post('/veterinarios', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['veterinarios'] });
      toast('success', editTarget ? 'Veterinário atualizado.' : 'Veterinário criado.');
      closeForm();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao salvar');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) =>
      api.patch(`/veterinarios/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['veterinarios'] });
      toast('success', status === 'inativo' ? 'Veterinário inativado.' : 'Veterinário reativado.');
      setConfirmToggle(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error ?? 'Erro ao alterar status');
      setConfirmToggle(null);
    },
  });

  function openForm(v?: Veterinario) {
    setEditTarget(v ?? null);
    setForm(v
      ? { clinica_id: v.clinica_id, nome: v.nome, crmv: v.crmv, telefone: v.telefone ?? '', email: v.email ?? '' }
      : { clinica_id: '', nome: '', crmv: '', telefone: '', email: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  const rows = data?.data ?? [];

  return (
    <div>
      <div className="page-header">
        <h1>Veterinários</h1>
        <button className="btn-primary" onClick={() => openForm()}>
          <Plus size={15} /> Novo Veterinário
        </button>
      </div>

      <div className="mb-5 w-64">
        <select
          className="input"
          value={clinicaFiltro}
          onChange={(e) => setClinicaFiltro(e.target.value)}
        >
          <option value="">Todas as clínicas</option>
          {(clinicas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Nome', 'CRMV', 'Clínica', 'Telefone', 'Status', ''].map((h) => (
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
                    icon={<Stethoscope size={22} />}
                    title="Nenhum veterinário encontrado"
                    description="Adicione o primeiro veterinário."
                    action={<button className="btn-primary" onClick={() => openForm()}>Novo Veterinário</button>}
                  />
                </td>
              </tr>
            ) : rows.map((v: Veterinario & { clinica_nome?: string }) => (
              <tr key={v.id} className="tr">
                <td className="td font-medium text-slate-900">{v.nome}</td>
                <td className="td font-mono text-xs">{v.crmv}</td>
                <td className="td">{v.clinica_nome ?? '—'}</td>
                <td className="td">{v.telefone ?? '—'}</td>
                <td className="td">
                  <span className={v.status === 'ativo' ? 'badge-green' : 'badge-gray'}>
                    {v.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openForm(v)}>
                      Editar
                    </button>
                    <button
                      className={`btn-ghost px-2 py-1 text-xs flex items-center gap-1 ${
                        v.status === 'ativo' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                      }`}
                      onClick={() => setConfirmToggle(v)}
                    >
                      {v.status === 'ativo'
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

      {/* Edit/Create modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editTarget ? 'Editar Veterinário' : 'Novo Veterinário'}
      >
        <div className="space-y-4">
          {!editTarget && (
            <div>
              <label className="label">Clínica</label>
              <select
                className="input"
                value={form.clinica_id}
                onChange={(e) => setForm((p) => ({ ...p, clinica_id: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {(clinicas ?? []).filter((c) => c.status === 'ativo').map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}
          {([
            { key: 'nome', label: 'Nome' },
            { key: 'crmv', label: 'CRMV' },
            { key: 'telefone', label: 'Telefone' },
            { key: 'email', label: 'E-mail' },
          ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
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

      {/* Confirm toggle status modal */}
      {confirmToggle && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmToggle(null)}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              {confirmToggle.status === 'ativo' ? 'Inativar veterinário?' : 'Reativar veterinário?'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {confirmToggle.status === 'ativo'
                ? <>O veterinário <strong>{confirmToggle.nome}</strong> não poderá ser selecionado em novos atendimentos.</>
                : <>O veterinário <strong>{confirmToggle.nome}</strong> voltará a estar disponível para atendimentos.</>
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
    </div>
  );
}
