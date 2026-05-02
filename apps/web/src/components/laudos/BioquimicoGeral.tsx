import { useState, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LaudoComponentProps } from '../../types';
import type { EspecieKey, FaixaIdade } from '../../utils/laudoTypeMapping';

/* ── Tipo de perfil ──────────────────────────────────────────────────────── */
export type BioPerfil =
  | 'basico1' | 'basico2' | 'basico3'
  | 'checkup1' | 'checkup2' | 'checkup3'
  | 'hepatico1' | 'hepatico2'
  | 'renal1' | 'renal2' | 'renal3' | 'renal4';

/* ── Campos disponíveis por perfil ───────────────────────────────────────── */
const PERFIL_ROWS: Record<BioPerfil, string[]> = {
  basico1:   ['alt', 'fa', 'creatinina'],
  basico2:   ['alt', 'fa', 'creatinina', 'ureia'],
  basico3:   ['alt', 'ast', 'fa', 'creatinina', 'ureia', 'glicose'],
  checkup1:  ['alt', 'ast', 'fa', 'ureia', 'creatinina', 'proteina_total'],
  checkup2:  ['alt', 'ast', 'fa', 'ggt', 'glicose', 'creatinina', 'ureia', 'albumina', 'proteina_total', 'triglicerideos', 'colesterol_total'],
  checkup3:  ['alt', 'ast', 'fa', 'ggt', 'glicose', 'creatinina', 'ureia', 'albumina', 'proteina_total', 'triglicerideos', 'colesterol_total'],
  hepatico1: ['alt', 'ast', 'fa', 'ggt', 'albumina', 'proteina_total'],
  hepatico2: ['alt', 'ast', 'fa', 'ggt', 'glicose', 'albumina', 'proteina_total', 'triglicerideos', 'colesterol_total'],
  renal1:    ['ureia', 'creatinina'],
  renal2:    ['ureia', 'creatinina', 'albumina', 'proteina_total'],
  renal3:    ['ureia', 'creatinina', 'albumina', 'proteina_total', 'fosforo'],
  renal4:    ['ureia', 'creatinina', 'albumina', 'proteina_total', 'fosforo', 'glicose'],
};

const PERFIL_LABELS: Record<BioPerfil, string> = {
  basico1: 'Básico 1', basico2: 'Básico 2', basico3: 'Básico 3',
  checkup1: 'Check-up 1', checkup2: 'Check-up 2', checkup3: 'Check-up 3',
  hepatico1: 'Hepático 1', hepatico2: 'Hepático 2',
  renal1: 'Renal 1', renal2: 'Renal 2', renal3: 'Renal 3', renal4: 'Renal 4',
};

const ALL_BIO_FIELDS: Record<string, { label: string; unit: string }> = {
  alt:              { label: 'ALT (TGP)',               unit: 'U/L'   },
  ast:              { label: 'AST (TGO)',               unit: 'U/L'   },
  fa:               { label: 'Fosfatase Alcalina (FA)', unit: 'U/L'   },
  ggt:              { label: 'GGT',                     unit: 'U/L'   },
  glicose:          { label: 'Glicose',                 unit: 'mg/dL' },
  creatinina:       { label: 'Creatinina',              unit: 'mg/dL' },
  ureia:            { label: 'Ureia',                   unit: 'mg/dL' },
  albumina:         { label: 'Albumina',                unit: 'g/dL'  },
  proteina_total:   { label: 'Proteína Total',          unit: 'g/dL'  },
  triglicerideos:   { label: 'Triglicerídeos',          unit: 'mg/dL' },
  colesterol_total: { label: 'Colesterol Total',        unit: 'mg/dL' },
  fosforo:          { label: 'Fósforo',                 unit: 'mg/dL' },
};

/* ── Tipos de referência ──────────────────────────────────────────────────── */
type Ref = { ref: string; unit: string };
type BioRefs = Record<string, Ref>;

/* ── Referências bioquímicas — Canino (sem variação por faixa) ───────────── */
const CAO_BIO: BioRefs = {
  alt:              { ref: '10–100 U/L',    unit: 'U/L'   },
  ast:              { ref: '16–55 U/L',     unit: 'U/L'   },
  fa:               { ref: '23–212 U/L',    unit: 'U/L'   },
  ggt:              { ref: '1–11 U/L',      unit: 'U/L'   },
  glicose:          { ref: '65–120 mg/dL',  unit: 'mg/dL' },
  creatinina:       { ref: '0,5–1,5 mg/dL', unit: 'mg/dL' },
  ureia:            { ref: '20–55 mg/dL',   unit: 'mg/dL' },
  albumina:         { ref: '2,6–4,0 g/dL',  unit: 'g/dL'  },
  proteina_total:   { ref: '5,2–8,2 g/dL',  unit: 'g/dL'  },
  triglicerideos:   { ref: '20–150 mg/dL',  unit: 'mg/dL' },
  colesterol_total: { ref: '130–300 mg/dL', unit: 'mg/dL' },
  fosforo:          { ref: '2,6–6,2 mg/dL', unit: 'mg/dL' },
};

/* ── Referências bioquímicas — Felino (varia por faixa) ──────────────────── */
const GATO_BIO: Record<FaixaIdade, BioRefs> = {
  filhote: {
    alt:              { ref: '10–88 U/L',     unit: 'U/L'   },
    ast:              { ref: '10–88 U/L',     unit: 'U/L'   },
    fa:               { ref: '25–180 U/L',    unit: 'U/L'   },
    ggt:              { ref: '0–10 U/L',      unit: 'U/L'   },
    glicose:          { ref: '75–140 mg/dL',  unit: 'mg/dL' },
    creatinina:       { ref: '0,5–1,2 mg/dL', unit: 'mg/dL' },
    ureia:            { ref: '10–60 mg/dL',   unit: 'mg/dL' },
    albumina:         { ref: '2,1–3,3 g/dL',  unit: 'g/dL'  },
    proteina_total:   { ref: '5,2–7,2 g/dL',  unit: 'g/dL'  },
    triglicerideos:   { ref: '10–350 mg/dL',  unit: 'mg/dL' },
    colesterol_total: { ref: '90–200 mg/dL',  unit: 'mg/dL' },
    fosforo:          { ref: '2,9–8,0 mg/dL', unit: 'mg/dL' },
  },
  adulto: {
    alt:              { ref: '10–88 U/L',     unit: 'U/L'   },
    ast:              { ref: '10–88 U/L',     unit: 'U/L'   },
    fa:               { ref: '7–80 U/L',      unit: 'U/L'   },
    ggt:              { ref: '0–10 U/L',      unit: 'U/L'   },
    glicose:          { ref: '75–140 mg/dL',  unit: 'mg/dL' },
    creatinina:       { ref: '0,8–1,8 mg/dL', unit: 'mg/dL' },
    ureia:            { ref: '10–60 mg/dL',   unit: 'mg/dL' },
    albumina:         { ref: '2,1–3,9 g/dL',  unit: 'g/dL'  },
    proteina_total:   { ref: '5,3–8,9 g/dL',  unit: 'g/dL'  },
    triglicerideos:   { ref: '10–350 mg/dL',  unit: 'mg/dL' },
    colesterol_total: { ref: '90–200 mg/dL',  unit: 'mg/dL' },
    fosforo:          { ref: '2,9–8,0 mg/dL', unit: 'mg/dL' },
  },
  idoso: {
    alt:              { ref: '10–88 U/L',     unit: 'U/L'   },
    ast:              { ref: '10–88 U/L',     unit: 'U/L'   },
    fa:               { ref: '7–80 U/L',      unit: 'U/L'   },
    ggt:              { ref: '0–10 U/L',      unit: 'U/L'   },
    glicose:          { ref: '75–140 mg/dL',  unit: 'mg/dL' },
    creatinina:       { ref: '0,8–2,4 mg/dL', unit: 'mg/dL' },
    ureia:            { ref: '10–65 mg/dL',   unit: 'mg/dL' },
    albumina:         { ref: '2,0–3,9 g/dL',  unit: 'g/dL'  },
    proteina_total:   { ref: '5,3–8,9 g/dL',  unit: 'g/dL'  },
    triglicerideos:   { ref: '10–350 mg/dL',  unit: 'mg/dL' },
    colesterol_total: { ref: '90–200 mg/dL',  unit: 'mg/dL' },
    fosforo:          { ref: '2,9–8,0 mg/dL', unit: 'mg/dL' },
  },
};

/* ── Referências de íons (apenas para Check-up 3) ────────────────────────── */
type IonsRef = { ref: string; unit: string };
type IonsRefs = { calcio_ionico: IonsRef; cloro: IonsRef; potassio: IonsRef; sodio: IonsRef; fosforo: IonsRef; metodo_cal: string };

const IONS_REFS: Record<EspecieKey, Record<FaixaIdade, IonsRefs>> = {
  cao: {
    filhote: {
      calcio_ionico: { ref: '1,12–1,45 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '104–122 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '4,5–6,0 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '142–160 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,6–6,2 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Electrochemical (EG-I30V)',
    },
    adulto: {
      calcio_ionico: { ref: '1,12–1,40 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '102–120 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '3,9–5,8 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '140–160 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,6–6,2 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Electrochemical (EG-I30V)',
    },
    idoso: {
      calcio_ionico: { ref: '1,10–1,38 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '101–118 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '3,8–5,5 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '138–158 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,6–6,2 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Eletrodo de Íon Seletivo (XI-921)',
    },
  },
  gato: {
    filhote: {
      calcio_ionico: { ref: '1,25–1,45 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '108–122 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '4,0–5,5 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '145–165 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,9–8,0 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Electrochemical (EG-I30V)',
    },
    adulto: {
      calcio_ionico: { ref: '1,20–1,40 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '107–120 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '3,5–5,1 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '145–165 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,9–8,0 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Electrochemical (EG-I30V)',
    },
    idoso: {
      calcio_ionico: { ref: '1,18–1,38 mmol/L', unit: 'mmol/L' },
      cloro:         { ref: '105–118 mEq/L',     unit: 'mEq/L'  },
      potassio:      { ref: '3,4–5,0 mEq/L',     unit: 'mEq/L'  },
      sodio:         { ref: '143–162 mEq/L',      unit: 'mEq/L'  },
      fosforo:       { ref: '2,9–8,0 mg/dL',      unit: 'mg/dL'  },
      metodo_cal:    'Electrochemical (EG-I30V)',
    },
  },
};

const IONS_ROWS: { key: string; ionsKey: keyof IonsRefs; label: string }[] = [
  { key: 'calcio_ionico', ionsKey: 'calcio_ionico', label: 'Cálcio Iônico' },
  { key: 'cloro',         ionsKey: 'cloro',         label: 'Cloreto'       },
  { key: 'potassio',      ionsKey: 'potassio',       label: 'Potássio'      },
  { key: 'sodio',         ionsKey: 'sodio',          label: 'Sódio'         },
  { key: 'fosforo_ions',  ionsKey: 'fosforo',        label: 'Fósforo'       },
];

/* ── Estilo ────────────────────────────────────────────────────────────────── */
const TEAL   = '#5b9ec9';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';
const BORDER = '#e2e8f0';

const valCell: CSSProperties = { padding: '4px 8px', borderBottom: `1px solid ${BORDER}`, verticalAlign: 'middle', textAlign: 'center', fontSize: 13, color: TEXT };
const refCell: CSSProperties = { padding: '4px 20px 4px 8px', borderBottom: `1px solid ${BORDER}`, verticalAlign: 'middle', textAlign: 'right', fontSize: 12, color: MUTED };

function ParamCell({ label }: { label: string }) {
  return (
    <td style={{ padding: '4px 8px 4px 20px', borderBottom: `1px solid ${BORDER}`, verticalAlign: 'middle', width: '45%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ whiteSpace: 'nowrap', fontSize: 13, color: TEXT }}>{label}</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #b0b8c8', height: '1em', marginBottom: 3, minWidth: 8, marginLeft: 4 }} />
      </div>
    </td>
  );
}

function NumInput({ value, onChange, width = 80 }: { value: number | undefined; onChange: (v: number | undefined) => void; width?: number }) {
  const [raw, setRaw] = useState(() => value != null ? String(value) : '');
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      const p = parseFloat(raw.replace(',', '.'));
      if (value == null) setRaw('');
      else if (isNaN(p) || Math.abs(p - value) > 0.00001) setRaw(String(value));
    }
  }, [value, raw]);
  return (
    <input type="text" inputMode="decimal" value={raw}
      onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value.replace(',', '.')); if (e.target.value === '') onChange(undefined); else if (!isNaN(n)) onChange(n); }}
      onBlur={() => { const n = parseFloat(raw.replace(',', '.')); if (!isNaN(n)) { setRaw(String(n)); onChange(n); } else { setRaw(''); onChange(undefined); } }}
      style={{ width, textAlign: 'center', border: `1px solid ${value != null ? '#93c5fd' : '#d1d5db'}`, borderRadius: 3, padding: '2px 4px', fontSize: 13, fontWeight: 500, background: value != null ? '#f0f7ff' : '#fff', color: TEXT, outline: 'none', fontFamily: 'inherit' }}
    />
  );
}

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR'); }
function sexoLabel(s?: string | null) { return s === 'M' ? 'Macho' : s === 'F' ? 'Fêmea' : 'Não Informado'; }
function idadeLabel(v?: number | null, u?: string | null) { return v == null ? 'Não Informado' : `${v} ${u ?? ''}`.trim(); }

const FAIXA_LABEL: Record<FaixaIdade, string> = { filhote: 'Filhote', adulto: 'Adulto', idoso: 'Idoso' };
const ESPECIE_LABEL: Record<EspecieKey, string> = { cao: 'Canino', gato: 'Felino' };

export function BioquimicoGeral({
  dados, atendimento, signingUser, readOnly, onChange,
  perfil, especie, faixaIdade = 'adulto',
}: LaudoComponentProps & { perfil: BioPerfil; especie: EspecieKey; faixaIdade?: FaixaIdade }) {
  const d = dados as Record<string, number | string | undefined>;
  const bioRefs: BioRefs = especie === 'cao' ? CAO_BIO : GATO_BIO[faixaIdade];
  const ionsRefs = perfil === 'checkup3' ? IONS_REFS[especie][faixaIdade] : null;

  const hoje = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const vetReq = atendimento.veterinario_nome
    ? `${atendimento.veterinario_nome} – CRMV${atendimento.veterinario_crmv ? `/${atendimento.veterinario_crmv}` : ''}`
    : 'Não informado';

  const especieStr = ESPECIE_LABEL[especie];
  const faixaStr = FAIXA_LABEL[faixaIdade];
  const titulo = `Bioquímico Sérico — ${PERFIL_LABELS[perfil]}`;
  const subtitulo = `${especieStr} · ${faixaStr}`;

  const bioRowKeys = PERFIL_ROWS[perfil];

  function SectionHeading({ children }: { children: React.ReactNode }) {
    return <div style={{ padding: '9px 20px 5px', fontWeight: 600, fontStyle: 'italic', fontSize: 15, color: TEXT, borderTop: '1.5px solid #1e293b' }}>{children}</div>;
  }

  return (
    <div style={{ fontFamily: "'Amasis MT Pro', Georgia, 'Times New Roman', serif", backgroundColor: '#fff', color: TEXT, backgroundImage: 'url(/fundo_laudo.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', backgroundSize: '80%', backgroundBlendMode: 'multiply' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', borderBottom: `2px solid ${TEAL}`, backgroundColor: '#fff', minHeight: 90 }}>
        <img src="/laudo_logo_atualizado.png" alt="Vertere" style={{ height: 58, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center', paddingLeft: 12 }}>
          <p style={{ color: TEAL, fontSize: 22, fontWeight: 400, margin: 0, lineHeight: 1.25 }}>Resultado Exame Veterinário</p>
          <p style={{ color: TEAL, fontSize: 18, fontWeight: 300, margin: '4px 0 0 0' }}>{titulo}</p>
          <p style={{ color: TEAL, fontSize: 14, fontWeight: 300, margin: '2px 0 0 0', opacity: 0.8 }}>{subtitulo}</p>
        </div>
      </div>

      {/* Dados do paciente */}
      <div style={{ padding: '0 20px', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 7px', gap: 16 }}>
          <span><strong>Data da Requisição</strong>: {fmtDate(atendimento.created_at)}</span>
          <span><strong>Protocolo</strong>: {atendimento.protocolo}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Nome</strong>: {atendimento.nome_animal ?? 'Não Informado'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Sexo</strong>: {sexoLabel(atendimento.sexo)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Raça</strong>: {atendimento.raca ?? 'Não Informado'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Proprietário</strong>: {atendimento.nome_proprietario ?? 'Não Informado'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Espécie</strong>: {atendimento.especie ?? 'Não Informado'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Idade</strong>: {idadeLabel(atendimento.idade_valor, atendimento.idade_unidade)}</span>
        </div>
        <div style={{ padding: '7px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <strong>Requisitante</strong>: {vetReq}
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div style={{ display: 'flex', alignItems: 'baseline', padding: '16px 20px 10px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: '0 0 45%', fontSize: 16, color: TEXT }}><strong>Material</strong>: Soro Sanguíneo</div>
        <div style={{ flex: '0 0 27%', textAlign: 'center', fontWeight: 700, fontSize: 16, color: TEXT }}>Resultado</div>
        <div style={{ flex: '0 0 28%', textAlign: 'right', fontWeight: 700, fontSize: 16, color: TEXT }}>Valores de Referência</div>
      </div>
      <div style={{ padding: '4px 20px 10px', fontSize: 12, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
        Método: Cinético UV / Colorimétrico · Equipamento: Bioanalisador Zybio Z-200
      </div>

      {/* Painel bioquímico */}
      <SectionHeading>Bioquímico Sérico</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup><col style={{ width: '45%' }} /><col style={{ width: '27%' }} /><col style={{ width: '28%' }} /></colgroup>
        <tbody>
          {bioRowKeys.map((key) => {
            const field = ALL_BIO_FIELDS[key];
            const r = bioRefs[key] as Ref | undefined;
            const val = d[key] as number | undefined;
            return (
              <tr key={key}>
                <ParamCell label={field?.label ?? key} />
                <td style={valCell}>
                  {readOnly
                    ? <span style={{ fontWeight: 600, color: val != null ? TEXT : '#cbd5e1' }}>{val ?? '—'}</span>
                    : <NumInput value={val} onChange={(v) => onChange({ [key]: v })} />}
                  {' '}<span style={{ fontSize: 11, color: MUTED }}>{r?.unit ?? field?.unit}</span>
                </td>
                <td style={refCell}>{r?.ref ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Seção de Íons (somente Check-up 3) */}
      {perfil === 'checkup3' && ionsRefs && (
        <>
          <SectionHeading>Eletrólitos</SectionHeading>
          <div style={{ padding: '4px 20px 8px', fontSize: 12, color: MUTED }}>
            Metodologia: {ionsRefs.metodo_cal} para CaI, Cl, K, Na · UV (Molibdato) para Fósforo · Equipamento: EXC-200 Zybio
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup><col style={{ width: '45%' }} /><col style={{ width: '27%' }} /><col style={{ width: '28%' }} /></colgroup>
            <tbody>
              {IONS_ROWS.map(({ key, ionsKey, label }) => {
                const r = ionsRefs[ionsKey] as IonsRef;
                const val = d[key] as number | undefined;
                return (
                  <tr key={key}>
                    <ParamCell label={label} />
                    <td style={valCell}>
                      {readOnly
                        ? <span style={{ fontWeight: 600, color: val != null ? TEXT : '#cbd5e1' }}>{val ?? '—'}</span>
                        : <NumInput value={val} onChange={(v) => onChange({ [key]: v })} />}
                      {' '}<span style={{ fontSize: 11, color: MUTED }}>{r.unit}</span>
                    </td>
                    <td style={refCell}>{r.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Observações */}
      <SectionHeading>Observações</SectionHeading>
      <div style={{ padding: '10px 20px 14px', fontSize: 13 }}>
        {readOnly
          ? <p style={{ color: (d.obs_gerais as string) ? TEXT : MUTED, fontStyle: d.obs_gerais ? 'normal' : 'italic', margin: 0, lineHeight: 1.5 }}>
              {(d.obs_gerais as string) || 'Sem observações.'}
            </p>
          : <textarea rows={2} value={(d.obs_gerais as string) ?? ''} placeholder="—"
              onChange={(e) => onChange({ obs_gerais: e.target.value || undefined })}
              style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '5px 8px', fontSize: 13, resize: 'vertical', color: TEXT, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
        }
      </div>

      {/* Rodapé */}
      <div style={{ padding: '14px 20px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 3px', fontSize: 13, color: TEXT }}>Jaraguá do Sul, {hoje}</p>
          <p style={{ margin: '0 0 3px', fontSize: 13, color: TEXT }}>Assinado eletronicamente por:</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>
            {signingUser
              ? `${signingUser.nome}${signingUser.crmv ? ` – CRMV/${signingUser.crmv}` : ''}`
              : <span style={{ color: MUTED, fontWeight: 400, fontStyle: 'italic', fontSize: 13 }}>— Não assinado —</span>}
          </p>
        </div>
      </div>

      <div style={{ background: '#374151', color: '#e5e7eb', padding: '8px 20px', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textAlign: 'center', letterSpacing: '0.01em' }}>
        Rua Marina Frutuoso, 460, Sala 05
        <span style={{ margin: '0 8px', color: '#9ca3af' }}>|</span>
        Centro, Jaraguá do Sul, SC – 89251-500
        <span style={{ margin: '0 8px', color: '#9ca3af' }}>|</span>
        (47) 92001 - 1733
        <span style={{ margin: '0 8px', color: '#9ca3af' }}>|</span>
        verterelab@gmail.com
      </div>
    </div>
  );
}
