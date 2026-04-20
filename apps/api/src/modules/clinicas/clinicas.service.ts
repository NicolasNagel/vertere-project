import { Pool } from 'pg';
import { CreateClinicaInput, UpdateClinicaInput } from './clinicas.schema';

export class ClinicasService {
  constructor(private pool: Pool) {}

  async list(page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const params: unknown[] = [`%${search ?? ''}%`, limit, offset];
    const { rows } = await this.pool.query(
      `SELECT * FROM clinicas WHERE nome ILIKE $1 ORDER BY nome ASC LIMIT $2 OFFSET $3`,
      params,
    );
    const { rows: count } = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM clinicas WHERE nome ILIKE $1`,
      [`%${search ?? ''}%`],
    );
    return { data: rows, total: count[0].total, page, limit };
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(`SELECT * FROM clinicas WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async create(input: CreateClinicaInput) {
    const { rows } = await this.pool.query(
      `INSERT INTO clinicas (nome, cnpj, endereco, telefone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.nome, input.cnpj, input.endereco ?? null, input.telefone ?? null, input.email ?? null],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateClinicaInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.nome !== undefined) { fields.push(`nome = $${i++}`); values.push(input.nome); }
    if (input.cnpj !== undefined) { fields.push(`cnpj = $${i++}`); values.push(input.cnpj); }
    if (input.endereco !== undefined) { fields.push(`endereco = $${i++}`); values.push(input.endereco); }
    if (input.telefone !== undefined) { fields.push(`telefone = $${i++}`); values.push(input.telefone); }
    if (input.email !== undefined) { fields.push(`email = $${i++}`); values.push(input.email); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE clinicas SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }

  async updateStatus(id: string, status: 'ativo' | 'inativo') {
    const { rows } = await this.pool.query(
      `UPDATE clinicas SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return rows[0] ?? null;
  }
}
