import { Pool } from 'pg';
import { CreateVeterinarioInput, UpdateVeterinarioInput } from './veterinarios.schema';

export class VeterinariosService {
  constructor(private pool: Pool) {}

  async list(page = 1, limit = 20, clinica_id?: string) {
    const offset = (page - 1) * limit;
    const conditions = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (clinica_id) {
      conditions.push(`v.clinica_id = $${i++}`);
      params.push(clinica_id);
    }

    params.push(limit, offset);
    const where = conditions.join(' AND ');

    const { rows } = await this.pool.query(
      `SELECT v.*, c.nome AS clinica_nome
       FROM veterinarios v
       JOIN clinicas c ON c.id = v.clinica_id
       WHERE ${where}
       ORDER BY v.nome ASC
       LIMIT $${i++} OFFSET $${i}`,
      params,
    );

    const countParams = clinica_id ? [clinica_id] : [];
    const countWhere = clinica_id ? `WHERE clinica_id = $1` : '';
    const { rows: count } = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM veterinarios ${countWhere}`,
      countParams,
    );

    return { data: rows, total: count[0].total, page, limit };
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT v.*, c.nome AS clinica_nome
       FROM veterinarios v
       JOIN clinicas c ON c.id = v.clinica_id
       WHERE v.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(input: CreateVeterinarioInput) {
    const { rows: clinicaRows } = await this.pool.query(
      `SELECT id FROM clinicas WHERE id = $1 AND status = 'ativo'`,
      [input.clinica_id],
    );
    if (!clinicaRows[0]) throw new Error('CLINICA_NOT_FOUND');

    const { rows } = await this.pool.query(
      `INSERT INTO veterinarios (clinica_id, nome, crmv, telefone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.clinica_id, input.nome, input.crmv, input.telefone ?? null, input.email ?? null],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateVeterinarioInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.nome !== undefined) { fields.push(`nome = $${i++}`); values.push(input.nome); }
    if (input.crmv !== undefined) { fields.push(`crmv = $${i++}`); values.push(input.crmv); }
    if (input.telefone !== undefined) { fields.push(`telefone = $${i++}`); values.push(input.telefone); }
    if (input.email !== undefined) { fields.push(`email = $${i++}`); values.push(input.email); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE veterinarios SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }
}
