CREATE TABLE IF NOT EXISTS usuarios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       VARCHAR(200) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  papel      VARCHAR(20) NOT NULL DEFAULT 'funcionario'
               CHECK (papel IN ('superadmin', 'admin', 'funcionario')),
  status     VARCHAR(10) NOT NULL DEFAULT 'ativo'
               CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
