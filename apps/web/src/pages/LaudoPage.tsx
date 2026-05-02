import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { LAUDO_REGISTRY } from '../components/laudos/registry';
import type { Atendimento, Laudo } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, CheckCircle, Download, Loader2 } from 'lucide-react';

export default function LaudoPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const atendimentoId = searchParams.get('atendimento_id');
  const tipo = searchParams.get('tipo') ?? 'hemograma_cao_adulto';
  const isNew = !id;

  const [dados, setDados] = useState<Record<string, unknown>>(() => ({
    ...LAUDO_REGISTRY[tipo]?.defaultDados,
  }));
  const [laudoId, setLaudoId] = useState<string | null>(id ?? null);
  const [isAssinado, setIsAssinado] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [initialized, setInitialized] = useState(isNew);
  const [savedSigningUser, setSavedSigningUser] = useState<{ nome: string; crmv?: string | null } | null>(null);

  const { data: existingLaudo } = useQuery<Laudo>({
    queryKey: ['laudo', id],
    queryFn: () => api.get(`/laudos/${id}`).then((r) => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingLaudo && !initialized) {
      setDados(existingLaudo.dados as Record<string, unknown>);
      setLaudoId(existingLaudo.id);
      setIsAssinado(existingLaudo.status === 'assinado');
      if (existingLaudo.usuario_nome) {
        setSavedSigningUser({ nome: existingLaudo.usuario_nome, crmv: existingLaudo.usuario_crmv });
      }
      setInitialized(true);
    }
  }, [existingLaudo, initialized]);

  const resolvedAtendimentoId = atendimentoId ?? existingLaudo?.atendimento_id ?? null;

  const { data: atendimento } = useQuery<Atendimento>({
    queryKey: ['atendimento', resolvedAtendimentoId],
    queryFn: () => api.get(`/atendimentos/${resolvedAtendimentoId}`).then((r) => r.data),
    enabled: !!resolvedAtendimentoId,
  });

  function mergeDados(partial: Record<string, unknown>) {
    setDados((prev) => ({ ...prev, ...partial }));
  }

  const salvarMutation = useMutation({
    mutationFn: async (status: 'rascunho' | 'assinado') => {
      const payload = { dados, status };
      if (laudoId) {
        return api.patch(`/laudos/${laudoId}`, payload).then((r) => r.data);
      }
      if (!resolvedAtendimentoId) throw new Error('atendimento_id ausente');
      return api
        .post('/laudos', { atendimento_id: resolvedAtendimentoId, tipo, ...payload })
        .then((r) => r.data);
    },
    onSuccess: (laudo: Laudo) => {
      setLaudoId(laudo.id);
      setIsAssinado(laudo.status === 'assinado');
      if (laudo.usuario_nome) {
        setSavedSigningUser({ nome: laudo.usuario_nome, crmv: laudo.usuario_crmv });
      }
      qc.invalidateQueries({ queryKey: ['laudos', resolvedAtendimentoId] });
      toast('success', laudo.status === 'assinado' ? 'Laudo finalizado.' : 'Rascunho salvo.');
    },
    onError: () => toast('error', 'Erro ao salvar laudo.'),
  });

  const baixarPDF = useCallback(async () => {
    if (!printRef.current) return;
    setIsPrinting(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const el = printRef.current;
      const elW = 794;
      const elH = el.scrollHeight;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: elW,
        height: elH,
        windowWidth: elW,
        windowHeight: elH,
        x: 0,
        y: 0,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // Scale to fit one A4 page, preserving all content
      const imgH = (canvas.height * pageW) / canvas.width;
      const scale = imgH > pageH ? pageH / imgH : 1;
      const finalW = pageW * scale;
      const finalH = imgH * scale;
      const x = (pageW - finalW) / 2;
      const y = (pageH - finalH) / 2;
      pdf.addImage(imgData, 'PNG', x, y, finalW, finalH);
      const proto = atendimento?.protocolo ?? 'laudo';
      pdf.save(`${tipo}_${proto}.pdf`);
    } catch {
      toast('error', 'Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsPrinting(false);
    }
  }, [atendimento, toast]);

  const isLoading = !isNew && !initialized;
  const readOnlyMode = isAssinado;
  const tipoLabel = LAUDO_REGISTRY[tipo]?.label ?? 'Laudo';
  const animalInfo = atendimento
    ? [atendimento.nome_animal, atendimento.especie, atendimento.protocolo].filter(Boolean).join(' · ')
    : null;

  // Em edição: usa o usuário logado; em modo leitura: usa quem assinou (salvo no laudo)
  const signingUser = readOnlyMode
    ? savedSigningUser
    : user ? { nome: user.nome, crmv: user.crmv } : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    /* Bleed through the parent's px-6 py-8 to create a full-width gray canvas */
    <div className="-mx-6 -mt-8 min-h-screen bg-slate-200">

      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">

          {/* Left: back + title + badge */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate">{tipoLabel}</span>
            {animalInfo && (
              <span className="hidden sm:inline text-xs text-slate-400 truncate">{animalInfo}</span>
            )}
            {isAssinado ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                <CheckCircle size={10} /> Finalizado
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                Rascunho
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {!readOnlyMode && (
              <>
                <button
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                  onClick={() => salvarMutation.mutate('rascunho')}
                  disabled={salvarMutation.isPending}
                >
                  <Save size={14} />
                  {salvarMutation.isPending ? 'Salvando...' : 'Salvar Rascunho'}
                </button>
                <button
                  className="btn-primary flex items-center gap-1.5 text-sm"
                  onClick={() => salvarMutation.mutate('assinado')}
                  disabled={salvarMutation.isPending}
                >
                  <CheckCircle size={14} />
                  Finalizar
                </button>
                <div className="w-px h-5 bg-slate-200" />
              </>
            )}
            <button
              className="btn-secondary flex items-center gap-1.5 text-sm"
              onClick={baixarPDF}
              disabled={isPrinting || !atendimento}
            >
              {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isPrinting ? 'Gerando...' : 'Baixar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Paper area */}
      <div className="max-w-3xl mx-auto py-8 px-4">
        {!atendimento ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded shadow-xl">
            Carregando dados do atendimento...
          </div>
        ) : (
          <>
            {/* Document — shadow gives "paper on desk" effect */}
            <div className="bg-white shadow-xl">
              {(() => {
                const entry = LAUDO_REGISTRY[tipo];
                if (!entry) return <p className="p-8 text-red-500 text-sm">Tipo de laudo desconhecido: {tipo}</p>;
                const LaudoComp = entry.component;
                return <LaudoComp dados={dados} atendimento={atendimento} signingUser={signingUser} readOnly={readOnlyMode} onChange={mergeDados} />;
              })()}
            </div>

            {/* Hidden print area — behind page via z-index:-1; left:0 so html2canvas can see it */}
            <div
              style={{ position: 'fixed', left: 0, top: 0, width: 794, pointerEvents: 'none', zIndex: -1 }}
              aria-hidden="true"
            >
              <div ref={printRef}>
                {(() => {
                  const entry = LAUDO_REGISTRY[tipo];
                  if (!entry) return null;
                  const LaudoComp = entry.component;
                  return <LaudoComp dados={dados} atendimento={atendimento} signingUser={signingUser} readOnly onChange={() => {}} />;
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
