import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { AtendimentosService } from './atendimentos.service';
import { CreateAtendimentoSchema, UpdateAtendimentoSchema } from './atendimentos.schema';
import { replyIfInvalidUUID, safeInt } from '../../utils/validate';

export async function atendimentosRoutes(app: FastifyInstance) {
  const svc = new AtendimentosService(getPool());

  app.get('/atendimentos', async (req) => {
    const q = req.query as Record<string, string>;
    return svc.list({
      page: safeInt(q.page, 1),
      limit: safeInt(q.limit, 20, 1, 100),
      clinica_id: q.clinica_id,
      veterinario_id: q.veterinario_id,
      protocolo: q.protocolo,
      data_inicio: q.data_inicio,
      data_fim: q.data_fim,
      mes: q.mes ? safeInt(q.mes, 0) : undefined,
      ano_filtro: q.ano_filtro ? safeInt(q.ano_filtro, 0) : undefined,
      tipo_plantao: q.tipo_plantao,
    });
  });

  app.get('/atendimentos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const atd = await svc.findById(id);
    if (!atd) return reply.status(404).send({ error: 'Atendimento não encontrado' });
    return atd;
  });

  app.post('/atendimentos', async (req, reply) => {
    const parsed = CreateAtendimentoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const atd = await svc.create(parsed.data);
      return reply.status(201).send(atd);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg === 'VET_CLINICA_MISMATCH')
        return reply.status(422).send({ error: 'Veterinário não pertence à clínica informada ou está inativo' });
      if (msg === 'EXAME_INVALIDO')
        return reply.status(422).send({ error: 'Um ou mais exames são inválidos ou inativos' });
      throw err;
    }
  });

  app.patch('/atendimentos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateAtendimentoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const atd = await svc.update(id, parsed.data);
      if (!atd) return reply.status(404).send({ error: 'Atendimento não encontrado' });
      return atd;
    } catch (err: unknown) {
      if ((err as Error).message === 'EXAME_INVALIDO')
        return reply.status(422).send({ error: 'Um ou mais exames são inválidos ou inativos' });
      throw err;
    }
  });
}
