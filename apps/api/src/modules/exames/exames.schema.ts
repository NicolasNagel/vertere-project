import { z } from 'zod';

export const CreateExameSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().max(500).optional(),
  valor: z.number().min(0),
});

export const UpdateExameSchema = CreateExameSchema.partial().extend({
  status: z.enum(['ativo', 'inativo']).optional(),
});

export type CreateExameInput = z.infer<typeof CreateExameSchema>;
export type UpdateExameInput = z.infer<typeof UpdateExameSchema>;
