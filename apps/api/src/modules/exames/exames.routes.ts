import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { ExamesService } from './exames.service';
import { CreateExameSchema, UpdateExameSchema } from './exames.schema';
import { replyIfInvalidUUID, safeInt } from '../../utils/validate';

export async function examesRoutes(app: FastifyInstance) {
  const svc = new ExamesService(getPool());
  const authAll = [app.authenticate];
  const adminOnly = [app.authorize(['superadmin', 'admin'])];

  app.get('/exames', { preHandler: authAll }, async (req) => {
    const q = req.query as Record<string, string>;
    if (q.ativos === 'true') return svc.list(true);
    return svc.listPaginated(safeInt(q.page, 1), safeInt(q.limit, 50, 1, 200));
  });

  app.get('/exames/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const exame = await svc.findById(id);
    if (!exame) return reply.status(404).send({ error: 'Exame não encontrado' });
    return exame;
  });

  app.post('/exames', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = CreateExameSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const exame = await svc.create(parsed.data);
    return reply.status(201).send(exame);
  });

  app.patch('/exames/:id', { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateExameSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const exame = await svc.update(id, parsed.data);
    if (!exame) return reply.status(404).send({ error: 'Exame não encontrado' });
    return exame;
  });
}
