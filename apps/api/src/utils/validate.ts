import { z } from 'zod';
import { FastifyReply } from 'fastify';

const uuidSchema = z.string().uuid();

export function replyIfInvalidUUID(id: string, reply: FastifyReply): boolean {
  if (!uuidSchema.safeParse(id).success) {
    reply.status(400).send({ error: 'ID inválido — deve ser um UUID' });
    return true;
  }
  return false;
}

export function safeInt(value: string | undefined, fallback: number, min = 1, max = 1000): number {
  const parsed = parseInt(value ?? String(fallback), 10);
  if (isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
