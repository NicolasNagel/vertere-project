import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';

export async function relatoriosRoutes(app: FastifyInstance) {
  const pool = getPool();

  app.get('/relatorios/receita', async (req, reply) => {
    const { data_inicio, data_fim } = req.query as { data_inicio?: string; data_fim?: string };

    if (!data_inicio || !data_fim) {
      return reply.status(422).send({ error: 'data_inicio e data_fim são obrigatórios' });
    }

    const { rows } = await pool.query(
      `SELECT
         DATE_TRUNC('month', created_at)::DATE AS mes,
         COUNT(*)::int AS total_atendimentos,
         SUM(valor_total)::numeric AS receita_total
       FROM atendimentos
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY 1
       ORDER BY 1`,
      [data_inicio, data_fim],
    );

    return rows;
  });

  app.get('/relatorios/volume', async (req, reply) => {
    const { data_inicio, data_fim } = req.query as { data_inicio?: string; data_fim?: string };

    if (!data_inicio || !data_fim) {
      return reply.status(422).send({ error: 'data_inicio e data_fim são obrigatórios' });
    }

    const [clinicasResult, vetsResult] = await Promise.all([
      pool.query(
        `SELECT c.nome AS clinica, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN clinicas c ON c.id = a.clinica_id
         WHERE a.created_at BETWEEN $1 AND $2
         GROUP BY c.nome ORDER BY total DESC`,
        [data_inicio, data_fim],
      ),
      pool.query(
        `SELECT v.nome AS veterinario, v.crmv, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN veterinarios v ON v.id = a.veterinario_id
         WHERE a.created_at BETWEEN $1 AND $2
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
