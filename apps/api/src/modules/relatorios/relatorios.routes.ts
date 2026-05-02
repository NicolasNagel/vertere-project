import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool } from '../../db';

const dateRangeSchema = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  clinica_id: z.string().uuid().optional(),
}).refine((d) => d.data_inicio <= d.data_fim, {
  message: 'data_inicio deve ser anterior ou igual a data_fim',
});

const fechamentoSchema = z.object({
  clinica_id: z.string().uuid('clinica_id deve ser um UUID válido'),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
}).refine((d) => d.data_inicio <= d.data_fim, {
  message: 'data_inicio deve ser anterior ou igual a data_fim',
});

export async function relatoriosRoutes(app: FastifyInstance) {
  const pool = getPool();
  const adminOnly = [app.authorize(['superadmin', 'admin'])];

  app.get('/relatorios/receita', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { data_inicio, data_fim, clinica_id } = parsed.data;

    const { rows } = await pool.query(
      `SELECT
         DATE_TRUNC('month', created_at)::DATE AS mes,
         COUNT(*)::int AS total_atendimentos,
         SUM(valor_total)::numeric AS receita_total
       FROM atendimentos
       WHERE created_at >= $1 AND created_at < ($2::date + interval '1 day')
         AND ($3::uuid IS NULL OR clinica_id = $3::uuid)
       GROUP BY 1
       ORDER BY 1`,
      [data_inicio, data_fim, clinica_id ?? null],
    );

    return rows;
  });

  app.get('/relatorios/volume', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { data_inicio, data_fim, clinica_id } = parsed.data;

    const [clinicasResult, vetsResult] = await Promise.all([
      pool.query(
        `SELECT c.nome AS clinica, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN clinicas c ON c.id = a.clinica_id
         WHERE a.created_at >= $1 AND a.created_at < ($2::date + interval '1 day')
           AND ($3::uuid IS NULL OR a.clinica_id = $3::uuid)
         GROUP BY c.nome ORDER BY total DESC`,
        [data_inicio, data_fim, clinica_id ?? null],
      ),
      pool.query(
        `SELECT v.nome AS veterinario, v.crmv, COUNT(a.id)::int AS total, SUM(a.valor_total)::numeric AS receita
         FROM atendimentos a
         JOIN veterinarios v ON v.id = a.veterinario_id
         WHERE a.created_at >= $1 AND a.created_at < ($2::date + interval '1 day')
           AND ($3::uuid IS NULL OR a.clinica_id = $3::uuid)
         GROUP BY v.nome, v.crmv ORDER BY total DESC`,
        [data_inicio, data_fim, clinica_id ?? null],
      ),
    ]);

    return {
      por_clinica: clinicasResult.rows,
      por_veterinario: vetsResult.rows,
    };
  });

  app.get('/relatorios/insights', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { data_inicio, data_fim, clinica_id } = parsed.data;

    const [categoriasResult, ticketResult, plantaoResult] = await Promise.all([
      pool.query(
        `SELECT e.categoria,
                COUNT(ae.id)::int      AS total,
                SUM(ae.valor)::numeric AS receita
         FROM atendimento_exames ae
         JOIN exames e ON e.id = ae.exame_id
         JOIN atendimentos a ON a.id = ae.atendimento_id
         WHERE a.created_at >= $1 AND a.created_at < ($2::date + interval '1 day')
           AND e.categoria <> 'Plantão'
           AND ($3::uuid IS NULL OR a.clinica_id = $3::uuid)
         GROUP BY e.categoria ORDER BY total DESC`,
        [data_inicio, data_fim, clinica_id ?? null],
      ),
      pool.query(
        `SELECT DATE_TRUNC('month', created_at)::DATE      AS mes,
                ROUND(AVG(valor_total)::numeric, 2)         AS ticket_medio,
                COUNT(*)::int                               AS total
         FROM atendimentos
         WHERE created_at >= $1 AND created_at < ($2::date + interval '1 day')
           AND ($3::uuid IS NULL OR clinica_id = $3::uuid)
         GROUP BY 1 ORDER BY 1`,
        [data_inicio, data_fim, clinica_id ?? null],
      ),
      pool.query(
        `SELECT CASE WHEN tipo_atendimento ILIKE '%plant%' THEN 'Plantão' ELSE 'Normal' END AS tipo,
                COUNT(*)::int        AS total,
                SUM(valor_total)::numeric AS receita
         FROM atendimentos
         WHERE created_at >= $1 AND created_at < ($2::date + interval '1 day')
           AND ($3::uuid IS NULL OR clinica_id = $3::uuid)
         GROUP BY 1`,
        [data_inicio, data_fim, clinica_id ?? null],
      ),
    ]);

    return {
      categorias: categoriasResult.rows,
      ticket_medio: ticketResult.rows,
      plantao_vs_normal: plantaoResult.rows,
    };
  });

  app.get('/relatorios/fechamento', { preHandler: adminOnly }, async (req, reply) => {
    const parsed = fechamentoSchema.safeParse(req.query);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });
    const { clinica_id, data_inicio, data_fim } = parsed.data;

    const baseWhere = `
      WHERE a.clinica_id = $1
        AND a.created_at >= $2
        AND a.created_at < ($3::date + interval '1 day')`;

    const [{ rows }, { rows: totaisRows }] = await Promise.all([
      pool.query(
        `SELECT
           c.nome                                                                AS clinica,
           a.created_at::DATE                                                    AS data,
           a.protocolo,
           v.nome                                                                AS veterinario,
           COALESCE(a.nome_animal, '-')                                          AS paciente,
           COALESCE(a.especie, '-')                                              AS especie,
           COALESCE(a.nome_proprietario, '-')                                    AS proprietario,
           COALESCE(
             STRING_AGG(DISTINCT e.categoria, ' / ')
               FILTER (WHERE e.categoria IS DISTINCT FROM 'Plantão'),
             '-'
           )                                                                     AS tipo_exame,
           COALESCE(
             STRING_AGG(e.nome, ' + ' ORDER BY e.nome)
               FILTER (WHERE e.categoria IS DISTINCT FROM 'Plantão'),
             '-'
           )                                                                     AS exame,
           CASE
             WHEN SUM(ae.valor) FILTER (WHERE e.categoria = 'Plantão') > 0
             THEN 'Plantão'
             ELSE 'Normal'
           END                                                                   AS tipo,
           COALESCE(SUM(ae.valor) FILTER (WHERE e.categoria IS DISTINCT FROM 'Plantão'), 0) AS valor,
           a.desconto,
           COALESCE(SUM(ae.valor) FILTER (WHERE e.categoria = 'Plantão'), 0)    AS adicional,
           GREATEST(0, SUM(ae.valor) - a.desconto)                              AS valor_total
         FROM atendimentos a
         JOIN clinicas c      ON c.id = a.clinica_id
         JOIN veterinarios v  ON v.id = a.veterinario_id
         JOIN atendimento_exames ae ON ae.atendimento_id = a.id
         JOIN exames e        ON e.id = ae.exame_id
         ${baseWhere}
         GROUP BY a.id, c.nome, v.nome, a.created_at, a.protocolo,
                  a.nome_animal, a.especie, a.nome_proprietario,
                  a.desconto
         ORDER BY a.created_at, a.protocolo`,
        [clinica_id, data_inicio, data_fim],
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(sub.valor_bruto), 0)::numeric AS valor_bruto,
           COALESCE(SUM(sub.desconto),    0)::numeric AS descontos,
           COALESCE(SUM(sub.adicional),   0)::numeric AS adicionais,
           COALESCE(GREATEST(0, SUM(sub.valor_bruto + sub.adicional - sub.desconto)), 0)::numeric AS valor_total
         FROM (
           SELECT
             a.id,
             COALESCE(SUM(ae.valor) FILTER (WHERE e.categoria IS DISTINCT FROM 'Plantão'), 0) AS valor_bruto,
             MAX(a.desconto)                                                                    AS desconto,
             COALESCE(SUM(ae.valor) FILTER (WHERE e.categoria = 'Plantão'), 0)                AS adicional
           FROM atendimentos a
           JOIN atendimento_exames ae ON ae.atendimento_id = a.id
           JOIN exames e              ON e.id = ae.exame_id
           ${baseWhere}
           GROUP BY a.id
         ) sub`,
        [clinica_id, data_inicio, data_fim],
      ),
    ]);

    const totais = {
      valor_bruto: Number(totaisRows[0].valor_bruto),
      adicionais:  Number(totaisRows[0].adicionais),
      descontos:   Number(totaisRows[0].descontos),
      valor_total: Number(totaisRows[0].valor_total),
    };

    return { rows, totais };
  });
}
