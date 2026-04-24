ALTER TABLE atendimentos
  ADD COLUMN IF NOT EXISTS criado_por_id   UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS criado_por_nome VARCHAR(200);

CREATE TABLE IF NOT EXISTS atendimento_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id UUID NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  usuario_id     UUID REFERENCES usuarios(id),
  usuario_nome   VARCHAR(200) NOT NULL,
  acao           VARCHAR(20) NOT NULL CHECK (acao IN ('criado', 'atualizado')),
  campos_alterados TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atd_logs_atendimento ON atendimento_logs(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_atd_logs_created     ON atendimento_logs(created_at DESC);
