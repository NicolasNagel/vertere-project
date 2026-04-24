import { z } from 'zod';

export const CreateUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  papel: z.enum(['superadmin', 'admin', 'funcionario']).default('funcionario'),
});

export const UpdateUsuarioSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  papel: z.enum(['superadmin', 'admin', 'funcionario']).optional(),
});

export const UpdateSenhaSchema = z.object({
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

export const UpdateStatusUsuarioSchema = z.object({
  status: z.enum(['ativo', 'inativo']),
});

export type CreateUsuarioInput = z.infer<typeof CreateUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
