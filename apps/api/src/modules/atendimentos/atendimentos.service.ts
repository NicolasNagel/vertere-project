import { Pool, PoolClient } from 'pg';
import { withTransaction } from '../../db';
import { gerarProtocolo } from '../../services/protocolo.service';
import { CreateAtendimentoInput, UpdateAtendimentoInput } from './atendimentos.schema';

const ATENDIMENTO_SELECT = `
  SELECT a.*, c.nome AS clinica_nome, v.nome AS veterinario_nome, v.crmv AS veterinario_crmv
  FROM atendimentos a
  JOIN clinicas c ON c.id = a.clinica_id
  JOIN veterinarios v ON v.id = a.veterinario_id
`;

const EXAMES_SELECT = `
  SELECT ae.*, e.nome AS exame_nome, e.categoria AS exame_categoria
  FROM atendimento_exames ae
  JOIN exames e ON e.id = ae.exame_id
  WHERE ae.atendimento_id = $1
`;

async function fetchWithExames(client: PoolClient | Pool, id: string) {
  const { rows } = await client.query(`${ATENDIMENTO_SELECT} WHERE a.id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: exames } = await client.query(EXAMES_SELECT, [id]);
  return { ...rows[0], exames };
}

export class AtendimentosService {
  constructor(private pool: Pool) {}

  async list(params: {
    page?: number;
    limit?: number;
    clinica_id?: string;
    veterinario_id?: string;
    protocolo?: string;
    data_inicio?: string;
    data_fim?: string;
    mes?: number;
    ano_filtro?: number;
    tipo_plantao?: string;
  }) {
    const { page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (params.clinica_id) { conditions.push(`a.clinica_id = $${i++}`); values.push(params.clinica_id); }
    if (params.veterinario_id) { conditions.push(`a.veterinario_id = $${i++}`); values.push(params.veterinario_id); }
    if (params.protocolo) { conditions.push(`a.protocolo ILIKE $${i++}`); values.push(`%${params.protocolo}%`); }
    if (params.data_inicio) { conditions.push(`a.created_at >= $${i++}`); values.push(params.data_inicio); }
    if (params.data_fim) { conditions.push(`a.created_at <= $${i++}`); values.push(params.data_fim); }
    if (params.mes) { conditions.push(`EXTRACT(MONTH FROM a.created_at) = $${i++}`); values.push(params.mes); }
    if (params.ano_filtro) { conditions.push(`EXTRACT(YEAR FROM a.created_at) = $${i++}`); values.push(params.ano_filtro); }
    if (params.tipo_plantao === 'plantao') {
      conditions.push(`EXISTS (SELECT 1 FROM atendimento_exames ae JOIN exames e ON e.id = ae.exame_id WHERE ae.atendimento_id = a.id AND e.categoria = 'Plantão' AND e.nome = 'Plantão')`);
    } else if (params.tipo_plantao === 'plantao_especial') {
      conditions.push(`EXISTS (SELECT 1 FROM atendimento_exames ae JOIN exames e ON e.id = ae.exame_id WHERE ae.atendimento_id = a.id AND e.categoria = 'Plantão' AND e.nome = 'Plantão Especial')`);
    } else if (params.tipo_plantao === 'normal') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM atendimento_exames ae JOIN exames e ON e.id = ae.exame_id WHERE ae.atendimento_id = a.id AND e.categoria = 'Plantão')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countValues = [...values];

    values.push(limit, offset);

    const { rows } = await this.pool.query(
      `${ATENDIMENTO_SELECT}
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      values,
    );

    const { rows: count } = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM atendimentos a ${where}`,
      countValues,
    );

    return { data: rows, total: count[0].total, page, limit };
  }

  async findById(id: string) {
    return fetchWithExames(this.pool, id);
  }

  async create(input: CreateAtendimentoInput) {
    return withTransaction(async (trx) => {
      const { rows: vetRows } = await trx.query(
        `SELECT id FROM veterinarios WHERE id = $1 AND clinica_id = $2 AND status = 'ativo'`,
        [input.veterinario_id, input.clinica_id],
      );
      if (!vetRows[0]) throw new Error('VET_CLINICA_MISMATCH');

      const exameIds = input.exames.map((e) => e.exame_id);
      const { rows: exameRows } = await trx.query(
        `SELECT id, valor FROM exames WHERE id = ANY($1) AND status = 'ativo'`,
        [exameIds],
      );
      if (exameRows.length !== exameIds.length) throw new Error('EXAME_INVALIDO');

      const exameMap = new Map(exameRows.map((e) => [e.id, e.valor]));

      const ano = new Date().getFullYear();
      const { protocolo, numero } = await gerarProtocolo(ano, trx);

      const { rows: atdRows } = await trx.query(
        `INSERT INTO atendimentos (protocolo, numero, ano, clinica_id, veterinario_id, especie, sexo, tipo_atendimento, nome_animal, raca, idade_valor, idade_unidade, nome_proprietario, metodo_coleta, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0)
         RETURNING *`,
        [
          protocolo, numero, ano,
          input.clinica_id, input.veterinario_id,
          input.especie ?? null, input.sexo ?? null, input.tipo_atendimento ?? null,
          input.nome_animal ?? null, input.raca ?? null,
          input.idade_valor ?? null, input.idade_unidade ?? null,
          input.nome_proprietario ?? null, input.metodo_coleta ?? null,
        ],
      );

      const atendimento = atdRows[0];

      const exameInsertRows = input.exames.map((item) => [atendimento.id, item.exame_id, exameMap.get(item.exame_id)]);
      const exameValues = exameInsertRows.flat();
      const examePlaceholders = exameInsertRows.map((row, idx) =>
        `(${row.map((_, col) => `$${idx * row.length + col + 1}`).join(', ')})`
      ).join(', ');
      await trx.query(
        `INSERT INTO atendimento_exames (atendimento_id, exame_id, valor) VALUES ${examePlaceholders}`,
        exameValues,
      );

      const { rows: totalRows } = await trx.query(
        `UPDATE atendimentos
         SET valor_total = (SELECT COALESCE(SUM(valor), 0) FROM atendimento_exames WHERE atendimento_id = $1)
         WHERE id = $1
         RETURNING valor_total`,
        [atendimento.id],
      );

      atendimento.valor_total = totalRows[0].valor_total;
      return atendimento;
    });
  }

  async update(id: string, input: UpdateAtendimentoInput) {
    return withTransaction(async (trx) => {
      const { rows: exists } = await trx.query(`SELECT id FROM atendimentos WHERE id = $1`, [id]);
      if (!exists[0]) return null;
      const fields: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      if (input.especie !== undefined) { fields.push(`especie = $${i++}`); values.push(input.especie); }
      if (input.sexo !== undefined) { fields.push(`sexo = $${i++}`); values.push(input.sexo); }
      if (input.tipo_atendimento !== undefined) { fields.push(`tipo_atendimento = $${i++}`); values.push(input.tipo_atendimento); }
      if (input.nome_animal !== undefined) { fields.push(`nome_animal = $${i++}`); values.push(input.nome_animal); }
      if (input.raca !== undefined) { fields.push(`raca = $${i++}`); values.push(input.raca); }
      if (input.idade_valor !== undefined) { fields.push(`idade_valor = $${i++}`); values.push(input.idade_valor); }
      if (input.idade_unidade !== undefined) { fields.push(`idade_unidade = $${i++}`); values.push(input.idade_unidade); }
      if (input.nome_proprietario !== undefined) { fields.push(`nome_proprietario = $${i++}`); values.push(input.nome_proprietario); }
      if (input.metodo_coleta !== undefined) { fields.push(`metodo_coleta = $${i++}`); values.push(input.metodo_coleta); }

      if (fields.length > 0) {
        values.push(id);
        await trx.query(
          `UPDATE atendimentos SET ${fields.join(', ')} WHERE id = $${i}`,
          values,
        );
      }

      if (input.exames) {
        const exameIds = input.exames.map((e) => e.exame_id);
        const { rows: exameRows } = await trx.query(
          `SELECT id, valor FROM exames WHERE id = ANY($1) AND status = 'ativo'`,
          [exameIds],
        );
        if (exameRows.length !== exameIds.length) throw new Error('EXAME_INVALIDO');
        const exameMap = new Map(exameRows.map((e) => [e.id, e.valor]));

        await trx.query(`DELETE FROM atendimento_exames WHERE atendimento_id = $1`, [id]);

        const updRows = input.exames.map((item) => [id, item.exame_id, exameMap.get(item.exame_id)]);
        const updValues = updRows.flat();
        const updPlaceholders = updRows.map((row, idx) =>
          `(${row.map((_, col) => `$${idx * row.length + col + 1}`).join(', ')})`
        ).join(', ');
        await trx.query(
          `INSERT INTO atendimento_exames (atendimento_id, exame_id, valor) VALUES ${updPlaceholders}`,
          updValues,
        );

        await trx.query(
          `UPDATE atendimentos
           SET valor_total = (SELECT COALESCE(SUM(valor), 0) FROM atendimento_exames WHERE atendimento_id = $1)
           WHERE id = $1`,
          [id],
        );
      }

      // Lê o resultado final dentro da própria transação para evitar dirty read
      return fetchWithExames(trx, id);
    });
  }
}
