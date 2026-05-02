import { z } from 'zod';

export const CreateLaudoSchema = z.object({
  atendimento_id: z.string().uuid(),
  tipo: z.string().min(1).max(50),
  dados: z.record(z.unknown()).optional().default({}),
});

export const UpdateLaudoSchema = z.object({
  dados: z.record(z.unknown()).optional(),
  status: z.enum(['rascunho', 'assinado']).optional(),
});

export type CreateLaudoInput = z.infer<typeof CreateLaudoSchema>;
export type UpdateLaudoInput = z.infer<typeof UpdateLaudoSchema>;
