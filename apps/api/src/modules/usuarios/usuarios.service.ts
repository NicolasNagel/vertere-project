import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { CreateUsuarioInput, UpdateUsuarioInput } from './usuarios.schema';

export class UsuariosService {
  constructor(private pool: Pool) {}

  async list(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { rows } = await this.pool.query(
      `SELECT id, nome, email, papel, status, created_at
       FROM usuarios
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const { rows: countRows } = await this.pool.query(`SELECT COUNT(*)::int AS total FROM usuarios`);
    return { data: rows, total: countRows[0].total, page, limit };
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, email, papel, status, created_at FROM usuarios WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(input: CreateUsuarioInput) {
    const senhaHash = await bcrypt.hash(input.senha, 10);
    const { rows } = await this.pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, papel, status, created_at`,
      [input.nome, input.email.toLowerCase().trim(), senhaHash, input.papel],
    );
    return rows[0];
  }

  async update(id: string, input: UpdateUsuarioInput) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.nome !== undefined) { fields.push(`nome = $${i++}`); values.push(input.nome); }
    if (input.email !== undefined) { fields.push(`email = $${i++}`); values.push(input.email.toLowerCase().trim()); }
    if (input.papel !== undefined) { fields.push(`papel = $${i++}`); values.push(input.papel); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, nome, email, papel, status, created_at`,
      values,
    );
    return rows[0] ?? null;
  }

  async updateSenha(id: string, novaSenha: string) {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const { rows } = await this.pool.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2
       RETURNING id, nome, email, papel, status, created_at`,
      [senhaHash, id],
    );
    return rows[0] ?? null;
  }

  async updateStatus(id: string, status: 'ativo' | 'inativo') {
    const { rows } = await this.pool.query(
      `UPDATE usuarios SET status = $1 WHERE id = $2
       RETURNING id, nome, email, papel, status, created_at`,
      [status, id],
    );
    return rows[0] ?? null;
  }
}
