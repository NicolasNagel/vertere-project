import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { VeterinariosService } from './veterinarios.service';
import { CreateVeterinarioSchema, UpdateVeterinarioSchema } from './veterinarios.schema';

export async function veterinariosRoutes(app: FastifyInstance) {
  const svc = new VeterinariosService(getPool());

  app.get('/veterinarios', async (req) => {
    const { page = '1', limit = '20', clinica_id } = req.query as Record<string, string>;
    return svc.list(Number(page), Number(limit), clinica_id);
  });

  app.get('/veterinarios/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const vet = await svc.findById(id);
    if (!vet) return reply.status(404).send({ error: 'Veterinário não encontrado' });
    return vet;
  });

  app.post('/veterinarios', async (req, reply) => {
    const parsed = CreateVeterinarioSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const vet = await svc.create(parsed.data);
      return reply.status(201).send(vet);
    } catch (err: unknown) {
      if ((err as Error).message === 'CLINICA_NOT_FOUND')
        return reply.status(422).send({ error: 'Clínica não encontrada' });
      if (isUniqueViolation(err))
        return reply.status(409).send({ error: 'CRMV já cadastrado' });
      throw err;
    }
  });

  app.patch('/veterinarios/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
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
