import { useState, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Atendimento, HemogramaCaoAdultoDados } from '../../types';

interface SigningUser {
  nome: string;
  crmv?: string | null;
}

interface Props {
  dados: HemogramaCaoAdultoDados;
  atendimento: Atendimento;
  signingUser: SigningUser | null;
  readOnly: boolean;
  onChange: (d: Partial<HemogramaCaoAdultoDados>) => void;
}

const ERITROGRAMA: {
  key: keyof HemogramaCaoAdultoDados; label: string; ref: string; unit: string; step: string;
}[] = [
  { key: 'eritrocitos',           label: 'Eritrócitos',           ref: '5.5 – 8 milhões/µL', unit: 'milhões/µL', step: '0.1' },
  { key: 'hematocrito',           label: 'Hematócrito',           ref: '37-55%',              unit: '%',          step: '1'   },
  { key: 'hemoglobina',           label: 'Hemoglobina',           ref: '12-18 g/dL',          unit: 'g/dL',       step: '0.1' },
  { key: 'vcm',                   label: 'V.C.M.',                ref: '60-77 fL',            unit: 'fL',         step: '0.1' },
  { key: 'hcm',                   label: 'H.C.M.',                ref: '19.5-24.5 pg',        unit: 'pg',         step: '0.1' },
  { key: 'chcm',                  label: 'C.H.C.M.',              ref: '30-36 g/dL',          unit: 'g/dL',       step: '0.1' },
  { key: 'proteinas_plasmaticas', label: 'Proteínas plasmáticas', ref: '5.5-8 g/dL',          unit: 'g/dL',       step: '0.1' },
];

const LEUCOGRAMA_DIFERENCIAIS: {
  key: keyof HemogramaCaoAdultoDados; label: string; ref: string;
}[] = [
  { key: 'metamielocitos_pct', label: 'Metamielócitos', ref: '0/µL'          },
  { key: 'bastonetes_pct',     label: 'Bastonetes',     ref: '0-300/µL'      },
  { key: 'segmentados_pct',    label: 'Segmentados',    ref: '3000-11500/µL' },
  { key: 'linfocitos_pct',     label: 'Linfócitos',     ref: '1100-4800/µL'  },
  { key: 'monocitos_pct',      label: 'Monócitos',      ref: '150-1350/µL'   },
  { key: 'eosinofilos_pct',    label: 'Eosinófilos',    ref: '100-1250/µL'   },
  { key: 'basofilos_pct',      label: 'Basófilos',      ref: '0-100/µL'      },
];

const OBS_FIELDS: { field: keyof HemogramaCaoAdultoDados; label: string }[] = [
  { field: 'obs_serie_vermelha', label: 'Série vermelha'        },
  { field: 'obs_serie_branca',   label: 'Série branca'          },
  { field: 'obs_plaquetas',      label: 'Avaliação plaquetária' },
  { field: 'obs_gerais',         label: 'Obs. gerais'           },
];

/* ── Cores ─────────────────────────────────────────────────── */
const TEAL   = '#5b9ec9';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';
const BORDER = '#e2e8f0';

/* ── Helpers ───────────────────────────────────────────────── */
function sexoLabel(s?: string | null) {
  if (s === 'M') return 'Macho';
  if (s === 'F') return 'Fêmea';
  return 'Não Informado';
}

function idadeLabel(v?: number | null, u?: string | null) {
  if (v == null) return 'Não Informado';
  return `${v} ${u ?? ''}`.trim();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function fmtInt(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR');
}

/* ── Section heading ───────────────────────────────────────── */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: '9px 20px 5px',
      fontWeight: 600,
      fontStyle: 'italic',
      fontSize: 15,
      color: TEXT,
      borderTop: '1.5px solid #1e293b',
    }}>
      {children}
    </div>
  );
}

/* ── Célula de parâmetro com dotted leader ─────────────────── */
function ParamCell({ label }: { label: string }) {
  return (
    <td style={{
      padding: '4px 8px 4px 20px',
      borderBottom: `1px solid ${BORDER}`,
      verticalAlign: 'middle',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ whiteSpace: 'nowrap', fontSize: 13, color: TEXT }}>{label}</span>
        <span style={{
          flex: 1,
          borderBottom: '1px dotted #b0b8c8',
          height: '1em',
          marginBottom: 3,
          minWidth: 8,
          marginLeft: 4,
        }} />
      </div>
    </td>
  );
}

const valCell: CSSProperties = {
  padding: '4px 8px',
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'middle',
  textAlign: 'center',
  fontSize: 13,
  color: TEXT,
};

const refCell: CSSProperties = {
  padding: '4px 20px 4px 8px',
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'middle',
  textAlign: 'right',
  fontSize: 12,
  color: MUTED,
};

/* ── NumInputField — componente de nível de arquivo com estado local de string ── */
function NumInputField({
  value, onChange, width = 68,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  width?: number;
}) {
  const [raw, setRaw] = useState(() => value != null ? String(value) : '');
  const prevExternal = useRef(value);

  // Sincroniza quando o valor externo muda (ex: carregamento de laudo existente)
  useEffect(() => {
    if (prevExternal.current !== value) {
      prevExternal.current = value;
      const parsed = parseFloat(raw.replace(',', '.'));
      if (value == null) {
        setRaw('');
      } else if (isNaN(parsed) || Math.abs(parsed - value) > 0.00001) {
        setRaw(String(value));
      }
    }
  }, [value, raw]);

  const filled = value != null;

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={(e) => {
        const str = e.target.value;
        setRaw(str);
        if (str === '') { onChange(undefined); return; }
        const num = parseFloat(str.replace(',', '.'));
        if (!isNaN(num)) onChange(num);
      }}
      onBlur={() => {
        const num = parseFloat(raw.replace(',', '.'));
        if (!isNaN(num)) { setRaw(String(num)); onChange(num); }
        else { setRaw(''); onChange(undefined); }
      }}
      style={{
        width,
        textAlign: 'center',
        border: `1px solid ${filled ? '#93c5fd' : '#d1d5db'}`,
        borderRadius: 3,
        padding: '2px 4px',
        fontSize: 13,
        fontWeight: 500,
        background: filled ? '#f0f7ff' : '#fff',
        color: TEXT,
        outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  );
}

/* ── PctInputField — igual ao NumInputField mas com width menor ── */
function PctInputField({
  value, onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [raw, setRaw] = useState(() => value != null ? String(value) : '');
  const prevExternal = useRef(value);

  useEffect(() => {
    if (prevExternal.current !== value) {
      prevExternal.current = value;
      const parsed = parseFloat(raw);
      if (value == null) {
        setRaw('');
      } else if (isNaN(parsed) || Math.abs(parsed - value) > 0.00001) {
        setRaw(String(value));
      }
    }
  }, [value, raw]);

  const filled = value != null;

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={(e) => {
        const str = e.target.value;
        setRaw(str);
        if (str === '') { onChange(undefined); return; }
        const num = parseFloat(str);
        if (!isNaN(num)) onChange(num);
      }}
      onBlur={() => {
        const num = parseFloat(raw);
        if (!isNaN(num)) { setRaw(String(num)); onChange(num); }
        else { setRaw(''); onChange(undefined); }
      }}
      style={{
        width: 46,
        textAlign: 'center',
        border: `1px solid ${filled ? '#93c5fd' : '#d1d5db'}`,
        borderRadius: 3,
        padding: '2px 3px',
        fontSize: 13,
        fontWeight: 500,
        background: filled ? '#f0f7ff' : '#fff',
        color: TEXT,
        outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  );
}

/* ── Main component ────────────────────────────────────────── */
export function HemogramaCaoAdulto({
  dados, atendimento, signingUser, readOnly, onChange,
}: Props) {
  const leucoTotal = dados.leucocitos_total;
  const absoluto = (pct?: number) =>
    pct != null && leucoTotal != null ? Math.round((leucoTotal * pct) / 100) : null;
  const leucoMil = leucoTotal != null
    ? (leucoTotal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    : null;

  const hoje = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  function InlineText({ field, placeholder, width }: {
    field: keyof HemogramaCaoAdultoDados; placeholder?: string; width?: number | string;
  }) {
    const val = dados[field] as string | undefined;
    if (readOnly) {
      return <span style={{ fontSize: 13, color: val ? TEXT : MUTED }}>{val || placeholder || '—'}</span>;
    }
    return (
      <input
        type="text" placeholder={placeholder}
        value={val ?? ''}
        onChange={(e) => onChange({ [field]: e.target.value || undefined })}
        style={{
          border: `1px solid ${BORDER}`, borderRadius: 3,
          padding: '2px 6px', fontSize: 13, color: TEXT,
          background: '#fff', outline: 'none',
          fontFamily: 'inherit', width: width ?? 240,
        }}
      />
    );
  }

  const tipoAmostra = dados.tipo_amostra || 'Sangue Total';
  const metodo = dados.metodo_analise
    || 'Contagem automatizada (BC-2800Vet) com conferência microscópica';
  const vetReq = atendimento.veterinario_nome
    ? `${atendimento.veterinario_nome} – CRMV${atendimento.veterinario_crmv ? `/${atendimento.veterinario_crmv}` : ''}`
    : 'Não informado';

  /* helper para renderizar valor numérico em modo leitura */
  function NumReadOnly({ value }: { value: number | undefined }) {
    return (
      <span style={{ fontSize: 13, fontWeight: 600, color: value != null ? TEXT : '#cbd5e1' }}>
        {value != null ? value : '—'}
      </span>
    );
  }

  function PctReadOnly({ value }: { value: number | undefined }) {
    return (
      <span style={{ fontSize: 13, fontWeight: 600, color: value != null ? TEXT : '#cbd5e1' }}>
        {value != null ? `${value}%` : '—'}
      </span>
    );
  }

  return (
    <div style={{
        fontFamily: "'Amasis MT Pro', 'Amasis MT', Georgia, 'Times New Roman', serif",
        backgroundColor: '#fff',
        color: TEXT,
        backgroundImage: 'url(/fundo_laudo.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: '80%',
        backgroundBlendMode: 'multiply',
      }}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 20px',
        borderBottom: `2px solid ${TEAL}`,
        backgroundColor: '#fff',
        minHeight: 90,
      }}>
        <img
          src="/laudo_logo_atualizado.png"
          alt="Vertere Laboratório Veterinário"
          style={{ height: 58, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ flex: 1, textAlign: 'center', paddingLeft: 12 }}>
          <p style={{ color: TEAL, fontSize: 22, fontWeight: 400, margin: 0, lineHeight: 1.25 }}>
            Resultado Exame Veterinário
          </p>
          <p style={{ color: TEAL, fontSize: 18, fontWeight: 300, margin: '6px 0 0 0' }}>
            Hemograma
          </p>
        </div>
      </div>

      {/* ── DADOS DO PACIENTE ───────────────────────────────── */}
      <div style={{ padding: '0 20px', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 7px', gap: 16 }}>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Data da Requisição</strong>: {fmtDate(atendimento.created_at)}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Protocolo</strong>: {atendimento.protocolo}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Nome</strong>: {atendimento.nome_animal ?? 'Não Informado'}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Sexo</strong>: {sexoLabel(atendimento.sexo)}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Raça</strong>: {atendimento.raca ?? 'Não Informado'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Proprietário</strong>: {atendimento.nome_proprietario ?? 'Não Informado'}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Espécie</strong>: {atendimento.especie ?? 'Não Informado'}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong>Idade</strong>: {idadeLabel(atendimento.idade_valor, atendimento.idade_unidade)}</span>
        </div>
        <div style={{ padding: '7px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span><strong>Requisitante</strong>: {vetReq}</span>
        </div>
      </div>

      {/* ── MATERIAL / RESULTADO / REFERÊNCIA ──────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        padding: '20px 20px 12px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ flex: '0 0 45%', fontSize: 16, color: TEXT }}>
          <strong>Material</strong>
          <span style={{ fontWeight: 400 }}>
            :{' '}
            {readOnly
              ? tipoAmostra
              : <InlineText field="tipo_amostra" placeholder="Sangue Total" width={200} />
            }
          </span>
        </div>
        <div style={{ flex: '0 0 27%', textAlign: 'center', fontWeight: 700, fontSize: 16, color: TEXT, whiteSpace: 'nowrap' }}>
          Resultado
        </div>
        <div style={{ flex: '0 0 28%', textAlign: 'right', fontWeight: 700, fontSize: 16, color: TEXT, whiteSpace: 'nowrap' }}>
          Valores de Referência
        </div>
      </div>
      <div style={{ padding: '4px 20px 10px', fontSize: 12, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
        {readOnly
          ? metodo
          : <InlineText field="metodo_analise" placeholder="Contagem automatizada (BC-2800Vet) com conferência microscópica" width="100%" />
        }
      </div>

      {/* ── TABELAS ─────────────────────────────────────────── */}
      <div>
        <div>

          {/* ERITROGRAMA */}
          <SectionHeading>Eritrograma</SectionHeading>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '45%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '28%' }} />
            </colgroup>
            <tbody>
              {ERITROGRAMA.map((row) => {
                const val = dados[row.key] as number | undefined;
                return (
                  <tr key={row.key}>
                    <ParamCell label={row.label} />
                    <td style={valCell}>
                      {readOnly
                        ? <NumReadOnly value={val} />
                        : <NumInputField value={val} onChange={(v) => onChange({ [row.key]: v })} />
                      }
                      {' '}
                      <span style={{ fontSize: 11, color: MUTED }}>{row.unit}</span>
                    </td>
                    <td style={refCell}>{row.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* LEUCOGRAMA */}
          <SectionHeading>Leucograma</SectionHeading>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <tbody>
              <tr>
                <ParamCell label="Leucócitos" />
                <td style={valCell} colSpan={2}>
                  {readOnly ? (
                    <span style={{ fontWeight: 600, fontSize: 13, color: leucoMil != null ? TEXT : '#cbd5e1' }}>
                      {leucoMil != null ? `${leucoMil} mil/µL` : '—'}
                    </span>
                  ) : (
                    <>
                      <NumInputField
                        value={dados.leucocitos_total as number | undefined}
                        onChange={(v) => onChange({ leucocitos_total: v })}
                        width={72}
                      />
                      {' '}
                      <span style={{ fontSize: 11, color: MUTED }}>/µL</span>
                    </>
                  )}
                </td>
                <td style={refCell}>6 – 17 mil/µL</td>
              </tr>
              {LEUCOGRAMA_DIFERENCIAIS.map((row) => {
                const pct = dados[row.key] as number | undefined;
                const abs = absoluto(pct);
                return (
                  <tr key={row.key}>
                    <ParamCell label={row.label} />
                    <td style={valCell}>
                      {readOnly
                        ? <PctReadOnly value={pct} />
                        : <PctInputField value={pct} onChange={(v) => onChange({ [row.key]: v })} />
                      }
                    </td>
                    <td style={valCell}>
                      <span style={{ fontWeight: 600, color: abs != null ? TEXT : '#cbd5e1' }}>
                        {abs != null ? fmtInt(abs) : '—'}
                      </span>
                      {abs != null && <span style={{ fontSize: 11, color: MUTED }}>/µL</span>}
                    </td>
                    <td style={refCell}>{row.ref}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PLAQUETAS */}
          <SectionHeading>Plaquetas</SectionHeading>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '45%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '28%' }} />
            </colgroup>
            <tbody>
              <tr>
                <ParamCell label="Contagem plaquetas" />
                <td style={valCell}>
                  {readOnly
                    ? <NumReadOnly value={dados.plaquetas as number | undefined} />
                    : <NumInputField
                        value={dados.plaquetas as number | undefined}
                        onChange={(v) => onChange({ plaquetas: v })}
                        width={80}
                      />
                  }
                  {' '}
                  <span style={{ fontSize: 11, color: MUTED }}>mil/µL</span>
                </td>
                <td style={refCell}>200.000-500.000 mil/µL</td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

      {/* ── OBSERVAÇÕES ─────────────────────────────────────── */}
      <SectionHeading>Observações</SectionHeading>
      <div style={{ padding: '10px 20px 14px', fontSize: 13 }}>
        {readOnly ? (
          OBS_FIELDS.some(({ field }) => dados[field]) ? (
            OBS_FIELDS.map(({ field, label }) => {
              const val = dados[field] as string | undefined;
              if (!val) return null;
              return (
                <p key={field} style={{ margin: '0 0 4px', color: TEXT, lineHeight: 1.5 }}>
                  {label}: {val}
                </p>
              );
            })
          ) : (
            <p style={{ color: MUTED, fontStyle: 'italic', margin: 0 }}>Sem observações.</p>
          )
        ) : (
          OBS_FIELDS.map(({ field, label }) => {
            const val = dados[field] as string | undefined;
            return (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 3 }}>
                  {label}:
                </label>
                <textarea
                  rows={2} value={val ?? ''} placeholder="—"
                  onChange={(e) => onChange({ [field]: e.target.value || undefined })}
                  style={{
                    width: '100%', border: `1px solid ${BORDER}`, borderRadius: 3,
                    padding: '5px 8px', fontSize: 13, resize: 'vertical',
                    color: TEXT, background: '#fff', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* ── RODAPÉ ASSINATURA ───────────────────────────────── */}
      <div style={{ padding: '14px 20px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 3px', fontSize: 13, color: TEXT }}>
            Jaraguá do Sul, {hoje}
          </p>
          <p style={{ margin: '0 0 3px', fontSize: 13, color: TEXT }}>
            Assinado eletronicamente por:
          </p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>
            {signingUser
              ? `${signingUser.nome}${signingUser.crmv ? ` – CRMV/${signingUser.crmv}` : ''}`
              : <span style={{ color: MUTED, fontWeight: 400, fontStyle: 'italic', fontSize: 13 }}>
                  — Não assinado —
                </span>
            }
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTATO ────────────────────────────────── */}
      <div style={{
        background: '#374151',
        color: '#e5e7eb',
        padding: '8px 20px',
        fontSize: 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textAlign: 'center',
        letterSpacing: '0.01em',
      }}>
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
