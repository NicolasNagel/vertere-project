import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Clinica } from '../types';
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react';

export default function ClinicasPage() {
  const qc = useQueryClient();
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
      editTarget
        ? api.patch(`/clinicas/${editTarget.id}`, payload)
        : api.post('/clinicas', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clinicas'] }); closeForm(); },
  });

  const toggleStatus = useMutation({
    mutationFn: (c: Clinica) =>
      api.patch(`/clinicas/${c.id}/status`, { status: c.status === 'ativo' ? 'inativo' : 'ativo' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinicas'] }),
  });

  function openForm(c?: Clinica) {
    setEditTarget(c ?? null);
    setForm(c ? { nome: c.nome, cnpj: c.cnpj, endereco: c.endereco ?? '', telefone: c.telefone ?? '', email: c.email ?? '' } : { nome: '', cnpj: '', endereco: '', telefone: '', email: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Clínicas</h1>
        <button onClick={() => openForm()} className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700">
          <Plus size={15} /> Nova Clínica
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="pl-9 pr-3 py-2 border border-gray-200 rounded-md w-72 text-sm"
          placeholder="Buscar clínica..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nome', 'CNPJ', 'Telefone', 'Email', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((c: Clinica) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.nome}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.cnpj}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.telefone ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{c.email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status === 'ativo' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 flex gap-2">
                    <button onClick={() => openForm(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => toggleStatus.mutate(c)} className="text-gray-500 hover:underline text-xs">
                      {c.status === 'ativo' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">{editTarget ? 'Editar Clínica' : 'Nova Clínica'}</h2>
            <div className="space-y-3">
              {(['nome', 'cnpj', 'endereco', 'telefone', 'email'] as const).map((f) => (
                <div key={f}>
                  <label className="text-sm font-medium text-gray-700 capitalize">{f}</label>
                  <input
                    className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    value={form[f]}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={closeForm} className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => upsert.mutate(form)}
                disabled={upsert.isPending}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {upsert.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {upsert.isError && (
              <p className="text-red-600 text-xs mt-2">
                {(upsert.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao salvar'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
