import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

export class AuthService {
  constructor(private pool: Pool) {}

  async login(email: string, senha: string) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, email, senha_hash, papel, status, crmv FROM usuarios WHERE email = $1`,
      [email.toLowerCase().trim()],
    );

    const usuario = rows[0];
    if (!usuario) return null;
    if (usuario.status === 'inativo') return null;

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return null;

    return {
      id: usuario.id as string,
      nome: usuario.nome as string,
      email: usuario.email as string,
      papel: usuario.papel as string,
      crmv: (usuario.crmv as string | null) ?? null,
    };
  }

  async findById(id: string) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, email, papel, status, crmv, created_at FROM usuarios WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }
}
