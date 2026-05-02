import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Pencil, Lock, Power } from 'lucide-react';
import { api } from '../api/client';
import { Usuario, UserPapel } from '../types';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { SkeletonTable } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const PAPEL_LABEL: Record<UserPapel, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  funcionario: 'Funcionário',
};

const PAPEL_BADGE: Record<UserPapel, string> = {
  superadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-brand-100 text-brand-800',
  funcionario: 'badge-gray',
};

interface CreateForm {
  nome: string;
  email: string;
  senha: string;
  papel: UserPapel;
  crmv: string;
}

interface EditForm {
  nome: string;
  email: string;
  papel: UserPapel;
  crmv: string;
}

const emptyCreate: CreateForm = { nome: '', email: '', senha: '', papel: 'funcionario', crmv: '' };

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [senhaTarget, setSenhaTarget] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [form, setForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', email: '', papel: 'funcionario', crmv: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get<{ data: Usuario[] }>('/usuarios').then((r) => r.data.data),
  });

  const criar = useMutation({
    mutationFn: ({ crmv, ...rest }: CreateForm) =>
      api.post('/usuarios', { ...rest, crmv: crmv || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast('success', 'Usuário criado com sucesso');
      setShowCreate(false);
      setForm(emptyCreate);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast('error', msg ?? 'Erro ao criar usuário');
    },
  });

  const atualizar = useMutation({
    mutationFn: ({ id, crmv, ...rest }: EditForm & { id: string }) =>
      api.patch(`/usuarios/${id}`, { ...rest, crmv: crmv || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast('success', 'Usuário atualizado');
      setEditTarget(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast('error', msg ?? 'Erro ao atualizar usuário');
    },
  });

  const trocarSenha = useMutation({
    mutationFn: ({ id, senha }: { id: string; senha: string }) => api.patch(`/usuarios/${id}/senha`, { senha }),
    onSuccess: () => {
      toast('success', 'Senha alterada com sucesso');
      setSenhaTarget(null);
      setNovaSenha('');
    },
    onError: () => toast('error', 'Erro ao alterar senha'),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'inativo' }) =>
      api.patch(`/usuarios/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast('success', 'Status atualizado');
    },
    onError: () => toast('error', 'Erro ao atualizar status'),
  });

  function openEdit(u: Usuario) {
    setEditForm({ nome: u.nome, email: u.email, papel: u.papel, crmv: u.crmv ?? '' });
    setEditTarget(u);
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1>Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os acessos ao sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} />
          Novo usuário
        </button>
      </div>

      <div className="card p-0">
        {isLoading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : !data?.length ? (
          <EmptyState
            icon={<UserPlus size={22} />}
            title="Nenhum usuário encontrado"
            action={<button className="btn-primary" onClick={() => setShowCreate(true)}>Criar usuário</button>}
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th className="th">Nome</th>
                  <th className="th">Email</th>
                  <th className="th">Papel</th>
                  <th className="th">Status</th>
                  <th className="th">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className="tr">
                    <td className="td font-medium text-slate-900">{u.nome}</td>
                    <td className="td text-slate-600">{u.email}</td>
                    <td className="td">
                      <span className={`badge ${PAPEL_BADGE[u.papel]}`}>{PAPEL_LABEL[u.papel]}</span>
                    </td>
                    <td className="td">
                      <span className={`badge ${u.status === 'ativo' ? 'badge-green' : 'badge-gray'}`}>
                        {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <button
                          className="btn btn-ghost p-1.5"
                          title="Editar"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost p-1.5"
                          title="Trocar senha"
                          onClick={() => { setSenhaTarget(u); setNovaSenha(''); }}
                        >
                          <Lock size={14} />
                        </button>
                        <button
                          className={`btn btn-ghost p-1.5 ${u.status === 'ativo' ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}`}
                          title={u.status === 'ativo' ? 'Inativar' : 'Ativar'}
                          onClick={() => toggleStatus.mutate({ id: u.id, status: u.status === 'ativo' ? 'inativo' : 'ativo' })}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal criar */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo usuário">
        <form
          onSubmit={(e) => { e.preventDefault(); criar.mutate(form); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Senha</label>
            <input type="password" className="input" value={form.senha} onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))} required minLength={6} />
          </div>
          <div>
            <label className="label">Papel</label>
            <select className="input" value={form.papel} onChange={(e) => setForm((p) => ({ ...p, papel: e.target.value as UserPapel }))}>
              <option value="funcionario">Funcionário</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="label">CRMV <span className="text-slate-400 font-normal">(se for veterinário)</span></label>
            <input
              className="input"
              placeholder="Ex: SC 14075"
              value={form.crmv}
              onChange={(e) => setForm((p) => ({ ...p, crmv: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={criar.isPending}>
              {criar.isPending ? 'Salvando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar usuário">
        <form
          onSubmit={(e) => { e.preventDefault(); if (editTarget) atualizar.mutate({ id: editTarget.id, ...editForm }); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="label">Nome</label>
            <input className="input" value={editForm.nome} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Papel</label>
            <select className="input" value={editForm.papel} onChange={(e) => setEditForm((p) => ({ ...p, papel: e.target.value as UserPapel }))}>
              <option value="funcionario">Funcionário</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="label">CRMV <span className="text-slate-400 font-normal">(se for veterinário)</span></label>
            <input
              className="input"
              placeholder="Ex: SC 14075"
              value={editForm.crmv}
              onChange={(e) => setEditForm((p) => ({ ...p, crmv: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={atualizar.isPending}>
              {atualizar.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal trocar senha */}
      <Modal open={!!senhaTarget} onClose={() => setSenhaTarget(null)} title={`Trocar senha — ${senhaTarget?.nome}`}>
        <form
          onSubmit={(e) => { e.preventDefault(); if (senhaTarget) trocarSenha.mutate({ id: senhaTarget.id, senha: novaSenha }); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="label">Nova senha</label>
            <input
              type="password"
              className="input"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setSenhaTarget(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={trocarSenha.isPending}>
              {trocarSenha.isPending ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
