CREATE TABLE laudos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id  UUID NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL,
  dados           JSONB NOT NULL DEFAULT '{}',
  veterinario_id  UUID REFERENCES veterinarios(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho', 'assinado')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_laudos_atendimento ON laudos(atendimento_id);
