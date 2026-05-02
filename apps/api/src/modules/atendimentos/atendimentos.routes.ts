import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { AtendimentosService } from './atendimentos.service';
import { CreateAtendimentoSchema, UpdateAtendimentoSchema } from './atendimentos.schema';
import { replyIfInvalidUUID, safeInt } from '../../utils/validate';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

function isValidUUID(v: string | undefined): boolean {
  return !v || uuidSchema.safeParse(v).success;
}

export async function atendimentosRoutes(app: FastifyInstance) {
  const svc = new AtendimentosService(getPool());
  const authAll = [app.authenticate];

  app.get('/atendimentos', { preHandler: authAll }, async (req, reply) => {
    const q = req.query as Record<string, string>;

    if (!isValidUUID(q.clinica_id))
      return reply.status(422).send({ error: 'clinica_id deve ser um UUID válido' });
    if (!isValidUUID(q.veterinario_id))
      return reply.status(422).send({ error: 'veterinario_id deve ser um UUID válido' });

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (q.data_inicio && !dateRe.test(q.data_inicio))
      return reply.status(422).send({ error: 'data_inicio deve ser YYYY-MM-DD' });
    if (q.data_fim && !dateRe.test(q.data_fim))
      return reply.status(422).send({ error: 'data_fim deve ser YYYY-MM-DD' });

    const VALID_SORT_BY = new Set(['protocolo', 'clinica', 'veterinario', 'valor_total', 'created_at']);
    const VALID_SORT_ORDER = new Set(['ASC', 'DESC']);

    return svc.list({
      page: safeInt(q.page, 1),
      limit: safeInt(q.limit, 20, 1, 100),
      clinica_id: q.clinica_id || undefined,
      veterinario_id: q.veterinario_id || undefined,
      protocolo: q.protocolo || undefined,
      busca: q.busca || undefined,
      data_inicio: q.data_inicio || undefined,
      data_fim: q.data_fim || undefined,
      mes: q.mes ? safeInt(q.mes, 0, 1, 12) : undefined,
      ano_filtro: q.ano_filtro ? safeInt(q.ano_filtro, 0, 2000, 2100) : undefined,
      tipo_plantao: q.tipo_plantao || undefined,
      sort_by: VALID_SORT_BY.has(q.sort_by) ? q.sort_by : undefined,
      sort_order: VALID_SORT_ORDER.has(q.sort_order?.toUpperCase()) ? q.sort_order.toUpperCase() : undefined,
    });
  });

  app.get('/atendimentos/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const atd = await svc.findById(id);
    if (!atd) return reply.status(404).send({ error: 'Atendimento não encontrado' });
    return atd;
  });

  app.post('/atendimentos', { preHandler: authAll }, async (req, reply) => {
    const parsed = CreateAtendimentoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const atd = await svc.create(parsed.data, req.user as { id: string; nome: string });
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

  app.get('/atendimentos/:id/logs', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    return svc.getLogs(id);
  });

  app.patch('/atendimentos/:id', { preHandler: authAll }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (replyIfInvalidUUID(id, reply)) return;
    const parsed = UpdateAtendimentoSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    try {
      const atd = await svc.update(id, parsed.data, req.user as { id: string; nome: string });
      if (!atd) return reply.status(404).send({ error: 'Atendimento não encontrado' });
      return atd;
    } catch (err: unknown) {
      if ((err as Error).message === 'EXAME_INVALIDO')
        return reply.status(422).send({ error: 'Um ou mais exames são inválidos ou inativos' });
      throw err;
    }
  });
}
