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
  valor_total: number;
  created_at: string;
  clinica_nome?: string;
  veterinario_nome?: string;
  veterinario_crmv?: string;
  exames?: AtendimentoExame[];
}
