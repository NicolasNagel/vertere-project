-- Habilita extensão pg_trgm para busca ILIKE eficiente em textos longos
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices GIN para busca por nome de animal e proprietário
CREATE INDEX IF NOT EXISTS idx_atd_nome_animal_trgm
  ON atendimentos USING GIN (nome_animal gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_atd_nome_proprietario_trgm
  ON atendimentos USING GIN (nome_proprietario gin_trgm_ops);
