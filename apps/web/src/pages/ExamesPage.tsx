import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Exame } from '../types';
import { Plus } from 'lucide-react';

export default function ExamesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Exame | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', valor: '' });

  const { data: exames, isLoading } = useQuery<Exame[]>({
    queryKey: ['exames'],
    queryFn: () => api.get('/exames').then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (payload: { nome: string; descricao?: string; valor: number }) =>
      editTarget ? api.patch(`/exames/${editTarget.id}`, payload) : api.post('/exames', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exames'] }); closeForm(); },
  });

  const toggleStatus = useMutation({
    mutationFn: (e: Exame) => api.patch(`/exames/${e.id}`, { status: e.status === 'ativo' ? 'inativo' : 'ativo' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exames'] }),
  });

  function openForm(e?: Exame) {
    setEditTarget(e ?? null);
    setForm(e ? { nome: e.nome, descricao: e.descricao ?? '', valor: String(e.valor) } : { nome: '', descricao: '', valor: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Catálogo de Exames</h1>
        <button onClick={() => openForm()} className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700">
          <Plus size={15} /> Novo Exame
        </button>
      </div>

      {isLoading ? <p className="text-gray-500 text-sm">Carregando...</p> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nome', 'Descrição', 'Valor (R$)', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(exames ?? []).map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{e.nome}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{e.descricao ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{Number(e.valor).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2.5 flex gap-2">
                    <button onClick={() => openForm(e)} className="text-blue-600 hover:underline text-xs">Editar</button>
                    <button onClick={() => toggleStatus.mutate(e)} className="text-gray-500 hover:underline text-xs">{e.status === 'ativo' ? 'Inativar' : 'Ativar'}</button>
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
            <h2 className="font-semibold text-lg mb-4">{editTarget ? 'Editar Exame' : 'Novo Exame'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <input className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" rows={2} value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor (R$)</label>
                <input type="number" step="0.01" min="0" className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={closeForm} className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={() => upsert.mutate({ nome: form.nome, descricao: form.descricao || undefined, valor: parseFloat(form.valor) })} disabled={upsert.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                {upsert.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
