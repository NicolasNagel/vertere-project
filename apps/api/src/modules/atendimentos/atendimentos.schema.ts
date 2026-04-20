import { z } from 'zod';

export const ExameItemSchema = z.object({
  exame_id: z.string().uuid(),
});

export const CreateAtendimentoSchema = z.object({
  clinica_id: z.string().uuid(),
  veterinario_id: z.string().uuid(),
  especie: z.string().max(50).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  tipo_atendimento: z.string().max(100).optional(),
  exames: z.array(ExameItemSchema).min(1, 'Pelo menos um exame é obrigatório'),
});

export const UpdateAtendimentoSchema = z.object({
  especie: z.string().max(50).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  tipo_atendimento: z.string().max(100).optional(),
  exames: z.array(ExameItemSchema).min(1).optional(),
});

export type CreateAtendimentoInput = z.infer<typeof CreateAtendimentoSchema>;
export type UpdateAtendimentoInput = z.infer<typeof UpdateAtendimentoSchema>;
