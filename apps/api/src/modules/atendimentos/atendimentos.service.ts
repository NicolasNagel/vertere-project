import { Pool } from 'pg';
import { withTransaction } from '../../db';
import { gerarProtocolo } from '../../services/protocolo.service';
import { CreateAtendimentoInput, UpdateAtendimentoInput } from './atendimentos.schema';

export class AtendimentosService {
  constructor(private pool: Pool) {}

  async list(params: {
    page?: number;
    limit?: number;
    clinica_id?: string;
    veterinario_id?: string;
    protocolo?: string;
    data_inicio?: string;
    data_fim?: string;
  }) {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (params.clinica_id) { conditions.push(`a.clinica_id = $${i++}`); values.push(params.clinica_id); }
    if (params.veterinario_id) { conditions.push(`a.veterinario_id = $${i++}`); values.push(params.veterinario_id); }
    if (params.protocolo) { conditions.push(`a.protocolo ILIKE $${i++}`); values.push(`%${params.protocolo}%`); }
    if (params.data_inicio) { conditions.push(`a.created_at >= $${i++}`); values.push(params.data_inicio); }
    if (params.data_fim) { conditions.push(`a.created_at <= $${i++}`); values.push(params.data_fim); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const { rows } = await this.pool.query(
      `SELECT a.*, c.nome AS clinica_nome, v.nome AS veterinario_nome, v.crmv AS veterinario_crmv
       FROM atendimentos a
       JOIN clinicas c ON c.id = a.clinica_id
       JOIN veterinarios v ON v.id = a.veterinario_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      values,
    );

    const countValues = values.slice(0, -2);
    const { rows: count } = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM atendimentos a ${where}`,
      countValues,
    );

    return { data: rows, total: count[0].total, page, limit };
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT a.*, c.nome AS clinica_nome, v.nome AS veterinario_nome, v.crmv AS veterinario_crmv
       FROM atendimentos a
       JOIN clinicas c ON c.id = a.clinica_id
       JOIN veterinarios v ON v.id = a.veterinario_id
       WHERE a.id = $1`,
      [id],
    );
    if (!rows[0]) return null;

    const { rows: exames } = await this.pool.query(
      `SELECT ae.*, e.nome AS exame_nome
       FROM atendimento_exames ae
       JOIN exames e ON e.id = ae.exame_id
       WHERE ae.atendimento_id = $1`,
      [id],
    );

    return { ...rows[0], exames };
  }

  async create(input: CreateAtendimentoInput) {
    return withTransaction(async (trx) => {
      const { rows: vetRows } = await trx.query(
        `SELECT id FROM veterinarios WHERE id = $1 AND clinica_id = $2 AND status = 'ativo'`,
        [input.veterinario_id, input.clinica_id],
      );
      if (!vetRows[0]) throw new Error('VET_CLINICA_MISMATCH');

      const exameIds = input.exames.map((e) => e.exame_id);
      const { rows: exameRows } = await trx.query(
        `SELECT id, valor FROM exames WHERE id = ANY($1) AND status = 'ativo'`,
        [exameIds],
      );
      if (exameRows.length !== exameIds.length) throw new Error('EXAME_INVALIDO');

      const exameMap = new Map(exameRows.map((e) => [e.id, e.valor]));

      const ano = new Date().getFullYear();
      const protocolo = await gerarProtocolo(ano, trx);
      const numero = parseInt(protocolo.split('-')[1], 10);

      const { rows: atdRows } = await trx.query(
        `INSERT INTO atendimentos (protocolo, numero, ano, clinica_id, veterinario_id, especie, sexo, tipo_atendimento, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
         RETURNING *`,
        [
          protocolo, numero, ano,
          input.clinica_id, input.veterinario_id,
          input.especie ?? null, input.sexo ?? null, input.tipo_atendimento ?? null,
        ],
      );

      const atendimento = atdRows[0];

      for (const item of input.exames) {
        const valor = exameMap.get(item.exame_id);
        await trx.query(
          `INSERT INTO atendimento_exames (atendimento_id, exame_id, valor) VALUES ($1, $2, $3)`,
          [atendimento.id, item.exame_id, valor],
        );
      }

      const { rows: totalRows } = await trx.query(
        `UPDATE atendimentos
         SET valor_total = (SELECT COALESCE(SUM(valor), 0) FROM atendimento_exames WHERE atendimento_id = $1)
         WHERE id = $1
         RETURNING valor_total`,
        [atendimento.id],
      );

      atendimento.valor_total = totalRows[0].valor_total;
      return atendimento;
    });
  }

  async update(id: string, input: UpdateAtendimentoInput) {
    const existing = await this.findById(id);
    if (!existing) return null;

    return withTransaction(async (trx) => {
      const fields: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      if (input.especie !== undefined) { fields.push(`especie = $${i++}`); values.push(input.especie); }
      if (input.sexo !== undefined) { fields.push(`sexo = $${i++}`); values.push(input.sexo); }
      if (input.tipo_atendimento !== undefined) { fields.push(`tipo_atendimento = $${i++}`); values.push(input.tipo_atendimento); }

      if (fields.length > 0) {
        values.push(id);
        await trx.query(
          `UPDATE atendimentos SET ${fields.join(', ')} WHERE id = $${i}`,
          values,
        );
      }

      if (input.exames) {
        const exameIds = input.exames.map((e) => e.exame_id);
        const { rows: exameRows } = await trx.query(
          `SELECT id, valor FROM exames WHERE id = ANY($1) AND status = 'ativo'`,
          [exameIds],
        );
        if (exameRows.length !== exameIds.length) throw new Error('EXAME_INVALIDO');
        const exameMap = new Map(exameRows.map((e) => [e.id, e.valor]));

        await trx.query(`DELETE FROM atendimento_exames WHERE atendimento_id = $1`, [id]);

        for (const item of input.exames) {
          await trx.query(
            `INSERT INTO atendimento_exames (atendimento_id, exame_id, valor) VALUES ($1, $2, $3)`,
            [id, item.exame_id, exameMap.get(item.exame_id)],
          );
        }

        await trx.query(
          `UPDATE atendimentos
           SET valor_total = (SELECT COALESCE(SUM(valor), 0) FROM atendimento_exames WHERE atendimento_id = $1)
           WHERE id = $1`,
          [id],
        );
      }

      return this.findById(id);
    });
  }
}
