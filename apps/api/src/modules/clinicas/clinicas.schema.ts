import { z } from 'zod';

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export const CreateClinicaSchema = z.object({
  nome: z.string().min(2).max(200),
  cnpj: z.string().regex(cnpjRegex, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)'),
  endereco: z.string().max(500).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
});

export const UpdateClinicaSchema = CreateClinicaSchema.partial();

export const UpdateStatusSchema = z.object({
  status: z.enum(['ativo', 'inativo']),
});

export type CreateClinicaInput = z.infer<typeof CreateClinicaSchema>;
export type UpdateClinicaInput = z.infer<typeof UpdateClinicaSchema>;
