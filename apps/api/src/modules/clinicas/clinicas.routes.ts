import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { ClinicasService } from './clinicas.service';
import { CreateClinicaSchema, UpdateClinicaSchema, UpdateStatusSchema } from './clinicas.schema';

export async function clinicasRoutes(app: FastifyInstance) {
  const svc = new ClinicasService(getPool());

  app.get('/clinicas', async (req, reply) => {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    return svc.list(Number(page), Number(limit), search);
  });

  app.get('/clinicas/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const clinica = await svc.findById(id);
    if (!clinica) return reply.status(404).send({ error: 'Clínica não encontrada' });
    return clinica;
  });

  app.post('/clinicas', async (req, reply) => {
    const parsed = CreateClinicaSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const clinica = await svc.create(parsed.data);
      return reply.status(201).send(clinica);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) return reply.status(409).send({ error: 'CNPJ já cadastrado' });
      throw err;
    }
  });

  app.patch('/clinicas/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateClinicaSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const clinica = await svc.update(id, parsed.data);
      if (!clinica) return reply.status(404).send({ error: 'Clínica não encontrada' });
      return clinica;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) return reply.status(409).send({ error: 'CNPJ já cadastrado' });
      throw err;
    }
  });

  app.patch('/clinicas/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const clinica = await svc.updateStatus(id, parsed.data.status);
    if (!clinica) return reply.status(404).send({ error: 'Clínica não encontrada' });
    return clinica;
  });
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505';
}
