-- clinicas
CREATE TABLE IF NOT EXISTS clinicas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR(200) NOT NULL,
  cnpj       VARCHAR(18) NOT NULL UNIQUE,
  endereco   TEXT,
  telefone   VARCHAR(20),
  email      VARCHAR(100),
  status     VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- veterinarios
CREATE TABLE IF NOT EXISTS veterinarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES clinicas(id),
  nome       VARCHAR(200) NOT NULL,
  crmv       VARCHAR(20) NOT NULL UNIQUE,
  telefone   VARCHAR(20),
  email      VARCHAR(100),
  status     VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- exames (catálogo)
CREATE TABLE IF NOT EXISTS exames (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      VARCHAR(150) NOT NULL,
  descricao TEXT,
  valor     NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  status    VARCHAR(10) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo'))
);

-- atendimentos
CREATE TABLE IF NOT EXISTS atendimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo        VARCHAR(20) NOT NULL UNIQUE,
  numero           INTEGER NOT NULL,
  ano              INTEGER NOT NULL,
  clinica_id       UUID NOT NULL REFERENCES clinicas(id),
  veterinario_id   UUID NOT NULL REFERENCES veterinarios(id),
  especie          VARCHAR(50),
  sexo             VARCHAR(1) CHECK (sexo IN ('M','F')),
  tipo_atendimento VARCHAR(100),
  valor_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (numero, ano)
);

-- atendimento_exames (N:N)
CREATE TABLE IF NOT EXISTS atendimento_exames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  UUID NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  exame_id        UUID NOT NULL REFERENCES exames(id),
  valor           NUMERIC(10,2) NOT NULL,
  UNIQUE (atendimento_id, exame_id)
);

-- índices de performance
CREATE INDEX IF NOT EXISTS idx_vet_clinica   ON veterinarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_atd_clinica   ON atendimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_atd_vet       ON atendimentos(veterinario_id);
CREATE INDEX IF NOT EXISTS idx_atd_exame     ON atendimento_exames(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_atd_created   ON atendimentos(created_at DESC);
