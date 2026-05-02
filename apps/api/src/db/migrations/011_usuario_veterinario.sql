ALTER TABLE usuarios ADD COLUMN crmv VARCHAR(20);

ALTER TABLE laudos
  DROP COLUMN veterinario_id,
  ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;
