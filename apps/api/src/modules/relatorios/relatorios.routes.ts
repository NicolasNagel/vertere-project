import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool } from '../../db';

const dateRangeSchema = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
});

export async function relatoriosRoutes(app: FastifyInstance) {
  const pool = getPool();

  app.get('/relatorios/receita', async (req, reply) => {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { data_inicio, data_fim } = parsed.data;

    const { rows } = await pool.query(
      `SELECT
         DATE_TRUNC('month', created_at)::DATE AS mes,
         COUNT(*)::int AS total_atendimentos,
         SUM(valor_total)::numeric AS receita_total
       FROM atendimentos
       WHERE created_at >= $1 AND created_at < ($2::date + interval '1 day')
       GROUP BY 1
       ORDER BY 1`,
      [data_inicio, data_fim],
    );

    return rows;
  });

  app.get('/relatorios/volume', async (req, reply) => {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { data_inicio, data_fim } = parsed.data;

    const [clinicasResult, vetsResult] = await Promise.all([
      pool.query(
        `SELECT c.nome AS clinica, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN clinicas c ON c.id = a.clinica_id
         WHERE a.created_at >= $1 AND a.created_at < ($2::date + interval '1 day')
         GROUP BY c.nome ORDER BY total DESC`,
        [data_inicio, data_fim],
      ),
      pool.query(
        `SELECT v.nome AS veterinario, v.crmv, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN veterinarios v ON v.id = a.veterinario_id
         WHERE a.created_at >= $1 AND a.created_at < ($2::date + interval '1 day')
         GROUP BY v.nome, v.crmv ORDER BY total DESC`,
        [data_inicio, data_fim],
      ),
    ]);

    return {
      por_clinica: clinicasResult.rows,
      por_veterinario: vetsResult.rows,
    };
  });
}
