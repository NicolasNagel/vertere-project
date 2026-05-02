export type UserPapel = 'superadmin' | 'admin' | 'funcionario';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  papel: UserPapel;
  crmv?: string | null;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: UserPapel;
  status: 'ativo' | 'inativo';
  crmv?: string | null;
  created_at: string;
}

export interface Clinica {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export interface Veterinario {
  id: string;
  clinica_id: string;
  nome: string;
  crmv: string;
  telefone?: string | null;
  email?: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export interface Exame {
  id: string;
  nome: string;
  descricao?: string | null;
  valor: number;
  categoria?: string | null;
  status: 'ativo' | 'inativo';
}

export interface AtendimentoExame {
  id: string;
  atendimento_id: string;
  exame_id: string;
  valor: number;
  exame_nome?: string;
  exame_categoria?: string | null;
}

export interface Atendimento {
  id: string;
  protocolo: string;
  numero: number;
  ano: number;
  clinica_id: string;
  veterinario_id: string;
  especie?: string | null;
  sexo?: 'M' | 'F' | null;
  tipo_atendimento?: string | null;
  nome_animal?: string | null;
  raca?: string | null;
  idade_valor?: number | null;
  idade_unidade?: 'dias' | 'meses' | 'anos' | null;
  nome_proprietario?: string | null;
  metodo_coleta?: string | null;
  hora_protocolo?: string | null;
  desconto: number;
  valor_total: number;
  created_at: string;
  clinica_nome?: string;
  veterinario_nome?: string;
  veterinario_crmv?: string;
  exames?: AtendimentoExame[];
}

export interface HemogramaCaoAdultoDados {
  eritrocitos?: number;
  hematocrito?: number;
  hemoglobina?: number;
  vcm?: number;
  hcm?: number;
  chcm?: number;
  proteinas_plasmaticas?: number;

  leucocitos_total?: number;
  metamielocitos_pct?: number;
  bastonetes_pct?: number;
  segmentados_pct?: number;
  linfocitos_pct?: number;
  monocitos_pct?: number;
  eosinofilos_pct?: number;
  basofilos_pct?: number;

  plaquetas?: number;

  obs_serie_vermelha?: string;
  obs_serie_branca?: string;
  obs_plaquetas?: string;
  obs_gerais?: string;

  tipo_amostra?: string;
  metodo_analise?: string;
}

export interface Laudo {
  id: string;
  atendimento_id: string;
  tipo: string;
  dados: Record<string, unknown>;
  usuario_id: string | null;
  usuario_nome?: string | null;
  usuario_crmv?: string | null;
  status: 'rascunho' | 'assinado';
  created_at: string;
  updated_at: string;
}

// ─── Interfaces genéricas para o sistema de laudos ───────────────────────────

export interface LaudoComponentProps {
  dados: Record<string, unknown>;
  atendimento: Atendimento;
  signingUser: { nome: string; crmv?: string | null } | null;
  readOnly: boolean;
  onChange: (d: Record<string, unknown>) => void;
}

export interface UrinaliseData {
  // Exame Físico
  volume?: string;
  cor?: string;
  aspecto?: string;
  densidade?: number;
  // Exame Químico
  nitrito?: string;
  proteinas?: string;
  ph?: number;
  cetonas?: string;
  bilirrubina?: string;
  glicose_quim?: string;
  // Sedimentoscopia
  hemacias?: string;
  leucocitos?: string;
  cel_epiteliais_queratinizadas?: string;
  cel_epiteliais_transicionais?: string;
  cilindros?: string;
  cristais?: string;
  bacterias?: string;
  muco?: string;
  gordura?: string;
  // Metadata
  metodo_obtencao?: string;
  obs_gerais?: string;
}

export interface IonsData {
  calcio_ionico?: number;
  cloro?: number;
  potassio?: number;
  sodio?: number;
  fosforo?: number;
  obs_gerais?: string;
  material?: string;
  metodo?: string;
}

export interface BioquimicoData {
  // Check-up 1
  alt?: number;
  ast?: number;
  fa?: number;
  glicose?: number;
  creatinina?: number;
  ureia?: number;
  albumina?: number;
  proteina_total?: number;
  // Check-up 2 (+ lipídios)
  triglicerideos?: number;
  colesterol_total?: number;
  ggt?: number;
  // Check-up 3 (+ Íons)
  calcio_ionico?: number;
  cloro?: number;
  potassio?: number;
  sodio?: number;
  fosforo_ions?: number;
  obs_gerais?: string;
  material?: string;
  metodo?: string;
}

export interface FechamentoRow {
  clinica: string;
  data: string;
  protocolo: string;
  veterinario: string;
  paciente: string;
  especie: string;
  proprietario: string;
  tipo_exame: string;
  exame: string;
  tipo: 'Normal' | 'Plantão';
  valor: string;
  desconto: string;
  adicional: string;
  valor_total: string;
}

export interface FechamentoTotais {
  valor_bruto: number;
  adicionais: number;
  descontos: number;
  valor_total: number;
}

export interface FechamentoResponse {
  rows: FechamentoRow[];
  totais: FechamentoTotais;
}
