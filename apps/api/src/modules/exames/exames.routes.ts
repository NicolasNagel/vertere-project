import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { ExamesService } from './exames.service';
import { CreateExameSchema, UpdateExameSchema } from './exames.schema';
import { replyIfInvalidUUID } from '../../utils/validate';

export async function examesRoutes(app: FastifyInstance) {
  const svc = new ExamesService(getPool());

  app.get('/exames', async (req) => {
    const { ativos } = req.query as { ativos?: string };
    return svc.list(ativos === 'true');
  });

  app.get('/exames/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const exame = await svc.findById(id);
    if (!exame) return reply.status(404).send({ error: 'Exame não encontrado' });
    return exame;
  });

  app.post('/exames', async (req, reply) => {
    const parsed = CreateExameSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const exame = await svc.create(parsed.data);
    return reply.status(201).send(exame);
  });

  app.patch('/exames/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateExameSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const exame = await svc.update(id, parsed.data);
    if (!exame) return reply.status(404).send({ error: 'Exame não encontrado' });
    return exame;
  });
}
