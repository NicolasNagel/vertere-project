import { Pool } from 'pg';
import { CreateLaudoInput, UpdateLaudoInput } from './laudos.schema';

export class LaudosService {
  constructor(private pool: Pool) {}

  async list(atendimento_id: string) {
    const { rows } = await this.pool.query(
      `SELECT l.*, u.nome AS usuario_nome, u.crmv AS usuario_crmv
       FROM laudos l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.atendimento_id = $1
       ORDER BY l.created_at DESC`,
      [atendimento_id],
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT l.*, u.nome AS usuario_nome, u.crmv AS usuario_crmv
       FROM laudos l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(input: CreateLaudoInput & { usuario_id: string }) {
    const { rows } = await this.pool.query(
      `INSERT INTO laudos (atendimento_id, tipo, dados, usuario_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.atendimento_id, input.tipo, JSON.stringify(input.dados ?? {}), input.usuario_id],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateLaudoInput & { usuario_id: string }) {
    const fields: string[] = ['updated_at = NOW()', 'usuario_id = $1'];
    const values: unknown[] = [input.usuario_id];
    let i = 2;

    if (input.dados !== undefined) { fields.push(`dados = $${i++}`); values.push(JSON.stringify(input.dados)); }
    if (input.status !== undefined) { fields.push(`status = $${i++}`); values.push(input.status); }

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE laudos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }

  async delete(id: string) {
    await this.pool.query(`DELETE FROM laudos WHERE id = $1`, [id]);
  }
}
