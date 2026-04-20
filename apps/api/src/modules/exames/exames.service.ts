import { Pool } from 'pg';
import { CreateExameInput, UpdateExameInput } from './exames.schema';

export class ExamesService {
  constructor(private pool: Pool) {}

  async list(apenasAtivos = false) {
    const where = apenasAtivos ? `WHERE status = 'ativo'` : '';
    const { rows } = await this.pool.query(
      `SELECT * FROM exames ${where} ORDER BY nome ASC`,
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT * FROM exames WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async create(input: CreateExameInput) {
    const { rows } = await this.pool.query(
      `INSERT INTO exames (nome, descricao, valor) VALUES ($1, $2, $3) RETURNING *`,
      [input.nome, input.descricao ?? null, input.valor],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateExameInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.nome !== undefined) { fields.push(`nome = $${i++}`); values.push(input.nome); }
    if (input.descricao !== undefined) { fields.push(`descricao = $${i++}`); values.push(input.descricao); }
    if (input.valor !== undefined) { fields.push(`valor = $${i++}`); values.push(input.valor); }
    if (input.status !== undefined) { fields.push(`status = $${i++}`); values.push(input.status); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE exames SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }
}
