import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { UsuariosService } from './usuarios.service';
import {
  CreateUsuarioSchema,
  UpdateUsuarioSchema,
  UpdateSenhaSchema,
  UpdateStatusUsuarioSchema,
} from './usuarios.schema';
import { replyIfInvalidUUID, safeInt } from '../../utils/validate';

export async function usuariosRoutes(app: FastifyInstance) {
  const svc = new UsuariosService(getPool());
  const superadminOnly = [app.authorize(['superadmin'])];

  app.get('/usuarios', { preHandler: superadminOnly }, async (req) => {
    const q = req.query as Record<string, string>;
    return svc.list(safeInt(q.page, 1), safeInt(q.limit, 20, 1, 100));
  });

  app.get('/usuarios/:id', { preHandler: superadminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const usuario = await svc.findById(id);
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
    return usuario;
  });

  app.post('/usuarios', { preHandler: superadminOnly }, async (req, reply) => {
    const parsed = CreateUsuarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const usuario = await svc.create(parsed.data);
      return reply.status(201).send(usuario);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505')
        return reply.status(409).send({ error: 'Email já cadastrado' });
      throw err;
    }
  });

  app.patch('/usuarios/:id', { preHandler: superadminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateUsuarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const usuario = await svc.update(id, parsed.data);
      if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
      return usuario;
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505')
        return reply.status(409).send({ error: 'Email já cadastrado' });
      throw err;
    }
  });

  app.patch('/usuarios/:id/senha', { preHandler: superadminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateSenhaSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const usuario = await svc.updateSenha(id, parsed.data.senha);
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
    return usuario;
  });

  app.patch('/usuarios/:id/status', { preHandler: superadminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateStatusUsuarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const usuario = await svc.updateStatus(id, parsed.data.status);
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado' });
    return usuario;
  });
}
