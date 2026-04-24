import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { clinicasRoutes } from './modules/clinicas/clinicas.routes';
import { veterinariosRoutes } from './modules/veterinarios/veterinarios.routes';
import { examesRoutes } from './modules/exames/exames.routes';
import { atendimentosRoutes } from './modules/atendimentos/atendimentos.routes';
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes';
import { getPool } from './db';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: { id: string; email: string; papel: string; nome: string };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; papel: string; nome: string };
    user: { id: string; email: string; papel: string; nome: string };
  }
}

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN ?? false)
      : true,
  });

  app.register(
    fp(async (instance: FastifyInstance) => {
      instance.register(jwt, {
        secret: process.env.JWT_SECRET ?? 'vertere-secret-change-in-production',
      });

      instance.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          await req.jwtVerify();
        } catch {
          reply.status(401).send({ error: 'Token inválido ou ausente' });
        }
      });

      instance.decorate('authorize', (roles: string[]) => async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          await req.jwtVerify();
        } catch {
          return reply.status(401).send({ error: 'Token inválido ou ausente' });
        }
        if (!roles.includes(req.user.papel)) {
          return reply.status(403).send({ error: 'Acesso não permitido para este perfil' });
        }
      });
    }),
  );

  app.get('/health', async () => {
    const pool = getPool();
    await pool.query('SELECT 1');
    return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  });

  app.register(authRoutes);
  app.register(clinicasRoutes);
  app.register(veterinariosRoutes);
  app.register(examesRoutes);
  app.register(atendimentosRoutes);
  app.register(relatoriosRoutes);
  app.register(usuariosRoutes);

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    reply.status(500).send({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    });
  });

  return app;
}
