import { useState, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { LaudoComponentProps } from '../../types';

export type UrinaliseEspecie = 'canino' | 'felino';

/* ── Referências por espécie ──────────────────────────────────────────────── */
const REFS_FISICO: Record<UrinaliseEspecie, { densidadeRef: string; metodObtencao: string }> = {
  canino: { densidadeRef: '1.015–1.045', metodObtencao: 'Sonda' },
  felino: { densidadeRef: '1.035–1.065', metodObtencao: 'Cistocentese' },
};

const TRANSICIONAIS_LABEL: Record<UrinaliseEspecie, string> = {
  canino: 'Transicionais Caudadas',
  felino: 'Transicionais Redondas',
};

const CRISTAIS_REF: Record<UrinaliseEspecie, string> = {
  canino: 'Negativo',
  felino: 'Negativo',
};

/* ── Estilo ────────────────────────────────────────────────────────────────── */
const TEAL   = '#5b9ec9';
const TEXT   = '#1e293b';
const MUTED  = '#64748b';
const BORDER = '#e2e8f0';

const labelCell: CSSProperties = {
  padding: '4px 8px 4px 20px',
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'middle',
  fontSize: 13,
  color: TEXT,
  width: '45%',
};
const valCell: CSSProperties = {
  padding: '4px 8px',
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'middle',
  textAlign: 'center',
  fontSize: 13,
  color: TEXT,
  width: '27%',
};
const refCell: CSSProperties = {
  padding: '4px 20px 4px 8px',
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: 'middle',
  textAlign: 'right',
  fontSize: 12,
  color: MUTED,
  width: '28%',
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '9px 20px 5px', fontWeight: 600, fontStyle: 'italic', fontSize: 15, color: TEXT, borderTop: '1.5px solid #1e293b' }}>
      {children}
    </div>
  );
}

function ParamLabel({ children }: { children: ReactNode }) {
  return (
    <td style={labelCell}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #b0b8c8', height: '1em', marginBottom: 3, minWidth: 8, marginLeft: 4 }} />
      </div>
    </td>
  );
}

function TextInput({ value, onChange, placeholder, width = 120 }: { value: string | undefined; onChange: (v: string | undefined) => void; placeholder?: string; width?: number | string }) {
  return (
    <input type="text" value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value || undefined)}
      style={{ width, textAlign: 'center', border: `1px solid ${value ? '#93c5fd' : '#d1d5db'}`, borderRadius: 3, padding: '2px 6px', fontSize: 13, fontWeight: 500, background: value ? '#f0f7ff' : '#fff', color: TEXT, outline: 'none', fontFamily: 'inherit' }}
    />
  );
}

function NumInput({ value, onChange, width = 72 }: { value: number | undefined; onChange: (v: number | undefined) => void; width?: number }) {
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

/* ── Componente principal ──────────────────────────────────────────────────── */
export function Urinalise({ dados, atendimento, signingUser, readOnly, onChange, especie }: LaudoComponentProps & { especie: UrinaliseEspecie }) {
  const d = dados as Record<string, string | number | undefined>;
  const refs = REFS_FISICO[especie];
  const hoje = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const vetReq = atendimento.veterinario_nome
    ? `${atendimento.veterinario_nome} – CRMV${atendimento.veterinario_crmv ? `/${atendimento.veterinario_crmv}` : ''}`
    : 'Não informado';
  const especieTitulo = especie === 'felino' ? 'Felino' : 'Canino';

  function txt(field: string) { return d[field] as string | undefined; }
  function num(field: string) { return d[field] as number | undefined; }

  // Rows explícitos com labels corretos
  const FISICO_ROWS: { field: string; label: string; ref?: string; isNum?: boolean }[] = [
    { field: 'volume',    label: 'Volume',    ref: '—'                    },
    { field: 'cor',       label: 'Cor',       ref: 'Amarela'              },
    { field: 'aspecto',   label: 'Aspecto',   ref: 'Turva / Límpida'      },
    { field: 'densidade', label: 'Densidade', ref: refs.densidadeRef, isNum: true },
  ];

  const QUIMICO_ROWS: { field: string; label: string; ref: string }[] = [
    { field: 'nitrito',       label: 'Nitrito',     ref: 'Negativo'     },
    { field: 'proteinas',     label: 'Proteínas',   ref: 'Negativo a +'  },
    { field: 'ph',            label: 'pH',          ref: '5.5–6.5'       },
    { field: 'cetonas',       label: 'Cetonas',     ref: 'Negativo'     },
    { field: 'bilirrubina',   label: 'Bilirrubina', ref: 'Negativo'     },
    { field: 'glicose_quim',  label: 'Glicose',     ref: 'Negativo'     },
  ];

  const SEDIMENTO_ROWS: { field: string; label: string; ref: string }[] = [
    { field: 'hemacias',                      label: 'Hemácias',                         ref: '0–3 por campo'  },
    { field: 'leucocitos',                    label: 'Leucócitos',                       ref: '0–3 por campo'  },
    { field: 'cel_epiteliais_queratinizadas', label: 'Células Epiteliais Queratinizadas', ref: 'Negativo a +'   },
    { field: 'cel_epiteliais_transicionais',  label: TRANSICIONAIS_LABEL[especie],        ref: 'Negativo a +/-' },
    { field: 'cilindros',                     label: 'Cilindros',                        ref: 'Negativo'       },
    { field: 'cristais',                      label: 'Cristais',                         ref: CRISTAIS_REF[especie] },
    { field: 'bacterias',                     label: 'Bactérias',                        ref: 'Negativo'       },
    { field: 'muco',                          label: 'Muco',                             ref: 'Negativo'       },
    { field: 'gordura',                       label: 'Gordura',                          ref: 'Negativo'       },
  ];

  return (
    <div style={{ fontFamily: "'Amasis MT Pro', Georgia, 'Times New Roman', serif", backgroundColor: '#fff', color: TEXT, backgroundImage: 'url(/fundo_laudo.jpg)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', backgroundSize: '80%', backgroundBlendMode: 'multiply' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', borderBottom: `2px solid ${TEAL}`, backgroundColor: '#fff', minHeight: 90 }}>
        <img src="/laudo_logo_atualizado.png" alt="Vertere" style={{ height: 58, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center', paddingLeft: 12 }}>
          <p style={{ color: TEAL, fontSize: 22, fontWeight: 400, margin: 0, lineHeight: 1.25 }}>Resultado Exame Veterinário</p>
          <p style={{ color: TEAL, fontSize: 18, fontWeight: 300, margin: '6px 0 0 0' }}>Urinálise — {especieTitulo}</p>
        </div>
      </div>

      {/* Dados do paciente */}
      <div style={{ padding: '0 20px', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 7px', gap: 16 }}>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Data da Requisição</strong>: {fmtDate(atendimento.created_at)}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Protocolo</strong>: {atendimento.protocolo}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Nome</strong>: {atendimento.nome_animal ?? 'Não Informado'}</span>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Sexo</strong>: {sexoLabel(atendimento.sexo)}</span>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Raça</strong>: {atendimento.raca ?? 'Não Informado'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0 8px', padding: '7px 0' }}>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Proprietário</strong>: {atendimento.nome_proprietario ?? 'Não Informado'}</span>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Espécie</strong>: {atendimento.especie ?? 'Não Informado'}</span>
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Idade</strong>: {idadeLabel(atendimento.idade_valor, atendimento.idade_unidade)}</span>
        </div>
        <div style={{ padding: '7px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span><strong>Requisitante</strong>: {vetReq}</span>
        </div>
      </div>

      {/* Material / cabeçalho da tabela */}
      <div style={{ display: 'flex', alignItems: 'baseline', padding: '16px 20px 10px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ flex: '0 0 45%', fontSize: 16, color: TEXT }}>
          <strong>Material</strong>: Urina
        </div>
        <div style={{ flex: '0 0 27%', textAlign: 'center', fontWeight: 700, fontSize: 16, color: TEXT }}>Resultado</div>
        <div style={{ flex: '0 0 28%', textAlign: 'right', fontWeight: 700, fontSize: 16, color: TEXT }}>Valores de Referência</div>
      </div>
      <div style={{ padding: '4px 20px 10px', fontSize: 12, color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
        Metodologia: Análise física, química e microscópica.{' '}
        <strong>Método de Obtenção:</strong>{' '}
        {readOnly
          ? (txt('metodo_obtencao') || refs.metodObtencao)
          : <input type="text" value={txt('metodo_obtencao') ?? refs.metodObtencao}
              onChange={(e) => onChange({ metodo_obtencao: e.target.value || undefined })}
              style={{ border: `1px solid ${BORDER}`, borderRadius: 3, padding: '2px 6px', fontSize: 12, color: TEXT, background: '#fff', outline: 'none', fontFamily: 'inherit', width: 140 }} />}
      </div>

      {/* Exame Físico */}
      <SectionHeading>Exame Físico</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup><col style={{ width: '45%' }} /><col style={{ width: '27%' }} /><col style={{ width: '28%' }} /></colgroup>
        <tbody>
          {FISICO_ROWS.map(({ field, label, ref: refV, isNum }) => (
            <tr key={field}>
              <ParamLabel>{label}</ParamLabel>
              <td style={valCell}>
                {isNum
                  ? readOnly
                    ? <span style={{ fontWeight: 600, color: num(field) != null ? TEXT : '#cbd5e1' }}>{num(field) ?? '—'}</span>
                    : <NumInput value={num(field)} onChange={(v) => onChange({ [field]: v })} />
                  : readOnly
                    ? <span style={{ fontWeight: 600, color: txt(field) ? TEXT : '#cbd5e1' }}>{txt(field) || '—'}</span>
                    : <TextInput value={txt(field)} onChange={(v) => onChange({ [field]: v })} />
                }
              </td>
              <td style={refCell}>{refV}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Exame Químico */}
      <SectionHeading>Exame Químico</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup><col style={{ width: '45%' }} /><col style={{ width: '27%' }} /><col style={{ width: '28%' }} /></colgroup>
        <tbody>
          {QUIMICO_ROWS.map(({ field, label, ref: refV }) => (
            <tr key={field}>
              <ParamLabel>{label}</ParamLabel>
              <td style={valCell}>
                {field === 'ph'
                  ? readOnly
                    ? <span style={{ fontWeight: 600, color: num('ph') != null ? TEXT : '#cbd5e1' }}>{num('ph') ?? '—'}</span>
                    : <NumInput value={num('ph')} onChange={(v) => onChange({ ph: v })} />
                  : readOnly
                    ? <span style={{ fontWeight: 600, color: txt(field) ? TEXT : '#cbd5e1' }}>{txt(field) || '—'}</span>
                    : <TextInput value={txt(field)} onChange={(v) => onChange({ [field]: v })} />
                }
              </td>
              <td style={refCell}>{refV}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sedimentoscopia */}
      <SectionHeading>Sedimentoscopia</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup><col style={{ width: '45%' }} /><col style={{ width: '27%' }} /><col style={{ width: '28%' }} /></colgroup>
        <tbody>
          {SEDIMENTO_ROWS.map(({ field, label, ref: refV }) => (
            <tr key={field}>
              <ParamLabel>{label}</ParamLabel>
              <td style={valCell}>
                {readOnly
                  ? <span style={{ fontWeight: 600, color: txt(field) ? TEXT : '#cbd5e1' }}>{txt(field) || '—'}</span>
                  : <TextInput value={txt(field)} onChange={(v) => onChange({ [field]: v })} />}
              </td>
              <td style={refCell}>{refV}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Observações */}
      <SectionHeading>Observações</SectionHeading>
      <div style={{ padding: '10px 20px 14px', fontSize: 13 }}>
        {readOnly
          ? <p style={{ color: txt('obs_gerais') ? TEXT : MUTED, fontStyle: txt('obs_gerais') ? 'normal' : 'italic', margin: 0, lineHeight: 1.5 }}>
              {txt('obs_gerais') || 'Sem observações.'}
            </p>
          : <textarea rows={3} value={txt('obs_gerais') ?? ''} placeholder="—"
              onChange={(e) => onChange({ obs_gerais: e.target.value || undefined })}
              style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '5px 8px', fontSize: 13, resize: 'vertical', color: TEXT, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
        }
        <p style={{ fontSize: 11, color: MUTED, marginTop: 6, marginBottom: 0 }}>
          O volume de amostra recomendado para a realização do exame é de no mínimo 10 mL.
        </p>
      </div>

      {/* Rodapé */}
      <div style={{ padding: '14px 20px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 3px', fontSize: 13, color: TEXT }}>
            Jaraguá do Sul, {hoje}
          </p>
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
