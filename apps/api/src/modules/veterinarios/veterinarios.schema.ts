import { z } from 'zod';

export const CreateVeterinarioSchema = z.object({
  clinica_id: z.string().uuid('clinica_id deve ser um UUID válido'),
  nome: z.string().min(2).max(200),
  crmv: z.string().min(5).max(20),
  telefone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional(),
});

export const UpdateVeterinarioSchema = CreateVeterinarioSchema.partial().omit({ clinica_id: true });

export type CreateVeterinarioInput = z.infer<typeof CreateVeterinarioSchema>;
export type UpdateVeterinarioInput = z.infer<typeof UpdateVeterinarioSchema>;
