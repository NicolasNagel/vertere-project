-- Torna cnpj opcional (muitas clínicas reais usam CPF ou não possuem documento)
ALTER TABLE clinicas ALTER COLUMN cnpj DROP NOT NULL;

-- Restringe metodo_coleta aos valores reais usados pela planilha de controle
ALTER TABLE atendimentos DROP CONSTRAINT IF EXISTS chk_metodo_coleta;
ALTER TABLE atendimentos
  ADD CONSTRAINT chk_metodo_coleta
  CHECK (metodo_coleta IS NULL OR metodo_coleta IN (
    'Motoboy','Helito/Nicolas','Internos','Uber','Marli'
  ));
