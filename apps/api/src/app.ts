import Fastify from 'fastify';
import cors from '@fastify/cors';
import { clinicasRoutes } from './modules/clinicas/clinicas.routes';
import { veterinariosRoutes } from './modules/veterinarios/veterinarios.routes';
import { examesRoutes } from './modules/exames/exames.routes';
import { atendimentosRoutes } from './modules/atendimentos/atendimentos.routes';
import { relatoriosRoutes } from './modules/relatorios/relatorios.routes';
import { getPool } from './db';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN ?? false)
      : true,
  });

  app.get('/health', async () => {
    const pool = getPool();
    await pool.query('SELECT 1');
    return { status: 'ok', db: 'connected', timestamp: new Date().toISOString() };
  });

  app.register(clinicasRoutes);
  app.register(veterinariosRoutes);
  app.register(examesRoutes);
  app.register(atendimentosRoutes);
  app.register(relatoriosRoutes);

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    reply.status(500).send({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    });
  });

  return app;
}
