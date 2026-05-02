import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { LaudosService } from './laudos.service';
import { CreateLaudoSchema, UpdateLaudoSchema } from './laudos.schema';
import { replyIfInvalidUUID } from '../../utils/validate';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export async function laudosRoutes(app: FastifyInstance) {
  const svc = new LaudosService(getPool());
  const authAll = [app.authenticate];

  app.get('/laudos', { preHandler: authAll }, async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (!q.atendimento_id || !uuidSchema.safeParse(q.atendimento_id).success)
      return reply.status(422).send({ error: 'atendimento_id deve ser um UUID válido' });
    return svc.list(q.atendimento_id);
  });

  app.post('/laudos', { preHandler: authAll }, async (req, reply) => {
    const parsed = CreateLaudoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const laudo = await svc.create({ ...parsed.data, usuario_id: req.user.id });
    return reply.status(201).send(laudo);
  });

  app.get('/laudos/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const laudo = await svc.findById(id);
    if (!laudo) return reply.status(404).send({ error: 'Laudo não encontrado' });
    return laudo;
  });

  app.patch('/laudos/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateLaudoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const laudo = await svc.update(id, { ...parsed.data, usuario_id: req.user.id });
    if (!laudo) return reply.status(404).send({ error: 'Laudo não encontrado' });
    return laudo;
  });

  app.delete('/laudos/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    await svc.delete(id);
    return reply.status(204).send();
  });
}
