import { FastifyInstance } from 'fastify';
import { getPool } from '../../db';
import { AuthService } from './auth.service';
import { LoginSchema } from './auth.schema';

export async function authRoutes(app: FastifyInstance) {
  const svc = new AuthService(getPool());

  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(422).send({ error: parsed.error.flatten() });

    const usuario = await svc.login(parsed.data.email, parsed.data.senha);
    if (!usuario) return reply.status(401).send({ error: 'Credenciais inválidas' });

    const token = app.jwt.sign(
      { id: usuario.id, email: usuario.email, papel: usuario.papel, nome: usuario.nome },
      { expiresIn: '8h' },
    );

    return reply.send({ token, user: usuario });
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (req) => {
    const usuario = await svc.findById(req.user.id);
    if (!usuario) return { id: req.user.id, email: req.user.email, papel: req.user.papel, nome: req.user.nome };
    return usuario;
  });
}
