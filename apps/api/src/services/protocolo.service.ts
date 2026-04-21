import { PoolClient } from 'pg';

export async function gerarProtocolo(ano: number, trx: PoolClient): Promise<{ protocolo: string; numero: number }> {
  // Advisory lock serializes concurrent protocol generation for the same year
  await trx.query(`SELECT pg_advisory_xact_lock($1)`, [ano]);

  const { rows } = await trx.query(
    `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo FROM atendimentos WHERE ano = $1`,
    [ano],
  );

  const numero: number = rows[0].proximo;
  const protocolo = `P${String(numero).padStart(4, '0')}/${ano}`;
  return { protocolo, numero };
}
