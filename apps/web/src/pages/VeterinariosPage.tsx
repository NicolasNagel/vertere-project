import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Veterinario, Clinica } from '../types';
import { Plus } from 'lucide-react';

export default function VeterinariosPage() {
  const qc = useQueryClient();
  const [clinicaFiltro, setClinicaFiltro] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Veterinario | null>(null);
  const [form, setForm] = useState({ clinica_id: '', nome: '', crmv: '', telefone: '', email: '' });

  const { data: clinicas } = useQuery<Clinica[]>({
    queryKey: ['clinicas-all'],
    queryFn: () => api.get('/clinicas', { params: { limit: 200 } }).then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['veterinarios', clinicaFiltro],
    queryFn: () => api.get('/veterinarios', { params: { clinica_id: clinicaFiltro || undefined, limit: 100 } }).then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (payload: typeof form) =>
      editTarget ? api.patch(`/veterinarios/${editTarget.id}`, payload) : api.post('/veterinarios', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['veterinarios'] }); closeForm(); },
  });

  function openForm(v?: Veterinario) {
    setEditTarget(v ?? null);
    setForm(v ? { clinica_id: v.clinica_id, nome: v.nome, crmv: v.crmv, telefone: v.telefone ?? '', email: v.email ?? '' } : { clinica_id: '', nome: '', crmv: '', telefone: '', email: '' });
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditTarget(null); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Veterinários</h1>
        <button onClick={() => openForm()} className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700">
          <Plus size={15} /> Novo Veterinário
        </button>
      </div>

      <select
        className="mb-4 border border-gray-200 rounded-md px-3 py-2 text-sm w-64"
        value={clinicaFiltro}
        onChange={(e) => setClinicaFiltro(e.target.value)}
      >
        <option value="">Todas as clínicas</option>
        {(clinicas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>

      {isLoading ? <p className="text-gray-500 text-sm">Carregando...</p> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nome', 'CRMV', 'Clínica', 'Telefone', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((v: Veterinario & { clinica_nome?: string }) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{v.nome}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.crmv}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.clinica_nome ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{v.telefone ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => openForm(v)} className="text-blue-600 hover:underline text-xs">Editar</button>
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
            <h2 className="font-semibold text-lg mb-4">{editTarget ? 'Editar Veterinário' : 'Novo Veterinário'}</h2>
            <div className="space-y-3">
              {!editTarget && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Clínica</label>
                  <select className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.clinica_id} onChange={(e) => setForm((p) => ({ ...p, clinica_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {(clinicas ?? []).filter((c) => c.status === 'ativo').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              {(['nome', 'crmv', 'telefone', 'email'] as const).map((f) => (
                <div key={f}>
                  <label className="text-sm font-medium text-gray-700 capitalize">{f.toUpperCase()}</label>
                  <input className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={closeForm} className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={() => upsert.mutate(form)} disabled={upsert.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                {upsert.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {upsert.isError && <p className="text-red-600 text-xs mt-2">{(upsert.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao salvar'}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
