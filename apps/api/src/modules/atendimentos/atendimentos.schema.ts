import { z } from 'zod';

export const ExameItemSchema = z.object({
  exame_id: z.string().uuid(),
});

const animalFields = {
  nome_animal: z.string().max(100).optional(),
  raca: z.string().max(100).optional(),
  idade_valor: z.number().int().min(0).optional(),
  idade_unidade: z.enum(['dias', 'meses', 'anos']).optional(),
  nome_proprietario: z.string().max(200).optional(),
  metodo_coleta: z.enum(['Motoboy', 'Helito/Nicolas', 'Internos', 'Uber', 'Marli']).optional(),
  hora_protocolo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
};

export const CreateAtendimentoSchema = z.object({
  clinica_id: z.string().uuid(),
  veterinario_id: z.string().uuid(),
  especie: z.string().max(50).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  tipo_atendimento: z.string().max(100).optional(),
  desconto: z.number().min(0).max(99999.99).optional().default(0),
  exames: z.array(ExameItemSchema).min(1, 'Pelo menos um exame é obrigatório'),
  ...animalFields,
});

export const UpdateAtendimentoSchema = z.object({
  especie: z.string().max(50).optional(),
  sexo: z.enum(['M', 'F']).optional(),
  tipo_atendimento: z.string().max(100).optional(),
  desconto: z.number().min(0).max(99999.99).optional(),
  exames: z.array(ExameItemSchema).min(1).optional(),
  ...animalFields,
});

export type CreateAtendimentoInput = z.infer<typeof CreateAtendimentoSchema>;
export type UpdateAtendimentoInput = z.infer<typeof UpdateAtendimentoSchema>;
