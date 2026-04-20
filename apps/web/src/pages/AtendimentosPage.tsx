import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Atendimento, Clinica, Veterinario, Exame } from '../types';
import { Plus, Eye } from 'lucide-react';

export default function AtendimentosPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ clinica_id: '', protocolo: '' });
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [form, setForm] = useState({
    clinica_id: '', veterinario_id: '', especie: '',
    sexo: '' as '' | 'M' | 'F', tipo_atendimento: '', exames: [] as string[],
  });

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
    queryFn: () => api.get('/veterinarios', { params: { clinica_id: form.clinica_id, limit: 100 } }).then((r) => r.data.data),
    enabled: !!form.clinica_id,
  });

  const { data: examesAtivos } = useQuery<Exame[]>({
    queryKey: ['exames-ativos'],
    queryFn: () => api.get('/exames', { params: { ativos: 'true' } }).then((r) => r.data),
  });

  const { data: detalhe } = useQuery({
    queryKey: ['atendimento', showDetail],
    queryFn: () => api.get(`/atendimentos/${showDetail}`).then((r) => r.data),
    enabled: !!showDetail,
  });

  const criar = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/atendimentos', {
        clinica_id: payload.clinica_id,
        veterinario_id: payload.veterinario_id,
        especie: payload.especie || undefined,
        sexo: payload.sexo || undefined,
        tipo_atendimento: payload.tipo_atendimento || undefined,
        exames: payload.exames.map((id) => ({ exame_id: id })),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['atendimentos'] }); closeForm(); },
  });

  const totalSelecionado = (examesAtivos ?? [])
    .filter((e) => form.exames.includes(e.id))
    .reduce((s, e) => s + Number(e.valor), 0);

  function toggleExame(id: string) {
    setForm((p) => ({
      ...p,
      exames: p.exames.includes(id) ? p.exames.filter((x) => x !== id) : [...p.exames, id],
    }));
  }

  function closeForm() { setShowForm(false); setForm({ clinica_id: '', veterinario_id: '', especie: '', sexo: '', tipo_atendimento: '', exames: [] }); }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Atendimentos</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-700">
          <Plus size={15} /> Novo Atendimento
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="border border-gray-200 rounded-md px-3 py-2 text-sm w-48"
          placeholder="Protocolo..."
          value={filters.protocolo}
          onChange={(e) => setFilters((p) => ({ ...p, protocolo: e.target.value }))}
        />
        <select
          className="border border-gray-200 rounded-md px-3 py-2 text-sm w-56"
          value={filters.clinica_id}
          onChange={(e) => setFilters((p) => ({ ...p, clinica_id: e.target.value }))}
        >
          <option value="">Todas as clínicas</option>
          {(clinicas ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-gray-500 text-sm">Carregando...</p> : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Protocolo', 'Clínica', 'Veterinário', 'Espécie', 'Valor Total', 'Data', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((a: Atendimento & { clinica_nome?: string; veterinario_nome?: string }) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono font-medium text-primary-700">{a.protocolo}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.clinica_nome}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.veterinario_nome}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.especie ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium">R$ {Number(a.valor_total).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => setShowDetail(a.id)} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      <Eye size={12} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-6">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="font-semibold text-lg mb-4">Novo Atendimento</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Clínica</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={form.clinica_id}
                  onChange={(e) => setForm((p) => ({ ...p, clinica_id: e.target.value, veterinario_id: '' }))}>
                  <option value="">Selecione...</option>
                  {(clinicas ?? []).filter((c) => c.status === 'ativo').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Veterinário</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  value={form.veterinario_id} disabled={!form.clinica_id}
                  onChange={(e) => setForm((p) => ({ ...p, veterinario_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {(vets ?? []).filter((v) => v.status === 'ativo').map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Espécie</label>
                  <input className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.especie} onChange={(e) => setForm((p) => ({ ...p, especie: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Sexo</label>
                  <select className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.sexo} onChange={(e) => setForm((p) => ({ ...p, sexo: e.target.value as '' | 'M' | 'F' }))}>
                    <option value="">—</option>
                    <option value="M">Macho</option>
                    <option value="F">Fêmea</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tipo de Atendimento</label>
                <input className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm" value={form.tipo_atendimento} onChange={(e) => setForm((p) => ({ ...p, tipo_atendimento: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Exames</label>
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                  {(examesAtivos ?? []).map((e) => (
                    <label key={e.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={form.exames.includes(e.id)} onChange={() => toggleExame(e.id)} className="rounded" />
                      <span className="text-sm flex-1">{e.nome}</span>
                      <span className="text-sm font-medium text-gray-600">R$ {Number(e.valor).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
                {form.exames.length > 0 && (
                  <p className="text-right text-sm font-semibold text-primary-700 mt-1">
                    Total: R$ {totalSelecionado.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={closeForm} className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={() => criar.mutate(form)} disabled={criar.isPending} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                {criar.isPending ? 'Registrando...' : 'Registrar Atendimento'}
              </button>
            </div>
            {criar.isError && <p className="text-red-600 text-xs mt-2">{(criar.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro ao salvar'}</p>}
          </div>
        </div>
      )}

      {showDetail && detalhe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Atendimento {detalhe.protocolo}</h2>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-32">Clínica:</dt><dd className="font-medium">{detalhe.clinica_nome}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-32">Veterinário:</dt><dd>{detalhe.veterinario_nome} ({detalhe.veterinario_crmv})</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-32">Espécie:</dt><dd>{detalhe.especie ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-32">Sexo:</dt><dd>{detalhe.sexo ?? '—'}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-32">Tipo:</dt><dd>{detalhe.tipo_atendimento ?? '—'}</dd></div>
            </dl>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Exames realizados:</p>
              <div className="space-y-1">
                {(detalhe.exames ?? []).map((e: { id: string; exame_nome: string; valor: number }) => (
                  <div key={e.id} className="flex justify-between text-sm">
                    <span>{e.exame_nome}</span>
                    <span className="font-medium">R$ {Number(e.valor).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary-700">R$ {Number(detalhe.valor_total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
