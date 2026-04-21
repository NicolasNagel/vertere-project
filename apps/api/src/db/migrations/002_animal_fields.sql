ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS nome_animal       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS raca              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS idade_valor       SMALLINT CHECK (idade_valor >= 0),
  ADD COLUMN IF NOT EXISTS idade_unidade     VARCHAR(6) CHECK (idade_unidade IN ('dias','meses','anos')),
  ADD COLUMN IF NOT EXISTS nome_proprietario VARCHAR(200);

ALTER TABLE atendimentos
  DROP CONSTRAINT IF EXISTS chk_idade_consistente,
  ADD CONSTRAINT chk_idade_consistente
    CHECK ((idade_valor IS NULL) = (idade_unidade IS NULL));
