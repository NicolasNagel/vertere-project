import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { VeterinariosService } from './veterinarios.service';
import { CreateVeterinarioSchema, UpdateVeterinarioSchema } from './veterinarios.schema';
import { replyIfInvalidUUID, safeInt } from '../../utils/validate';

export async function veterinariosRoutes(app: FastifyInstance) {
  const svc = new VeterinariosService(getPool());
  const authAll = [app.authenticate];
  const adminOnly = [app.authorize(['superadmin', 'admin'])];

  app.get('/veterinarios', { preHandler: authAll }, async (req) => {
    const q = req.query as Record<string, string>;
    return svc.list(safeInt(q.page, 1), safeInt(q.limit, 20, 1, 100), q.clinica_id);
  });

  app.get('/veterinarios/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const vet = await svc.findById(id);
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' });
    return vet;
  });

  app.post('/veterinarios', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = CreateVeterinarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const vet = await svc.create(parsed.data);
      return reply.status(201).send(vet);
    } catch (err: unknown) {
      if ((err as Error).message === 'CLINICA_NOT_FOUND')
        return reply.status(422).send({ error: 'Clínica não encontrada ou inativa' });
      if (isUniqueViolation(err))
        return reply.status(409).send({ error: 'CRMV já cadastrado' });
      throw err;
    }
  });

  app.patch('/veterinarios/:id', { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateVeterinarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const vet = await svc.update(id, parsed.data);
      if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' });
      return vet;
    } catch (err: unknown) {
      if (isUniqueViolation(err))
        return reply.status(409).send({ error: 'CRMV já cadastrado' });
      throw err;
    }
  });
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505';
}
