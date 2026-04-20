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
  status: 'ativo' | 'inativo';
}

export interface AtendimentoExame {
  id: string;
  atendimento_id: string;
  exame_id: string;
  valor: number;
  nome?: string;
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
  valor_total: number;
  created_at: string;
  clinica?: Pick<Clinica, 'nome'>;
  veterinario?: Pick<Veterinario, 'nome' | 'crmv'>;
  exames?: AtendimentoExame[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
