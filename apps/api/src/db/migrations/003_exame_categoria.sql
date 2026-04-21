ALTER TABLE exames ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

-- Limpa dados de seed e substitui pelos dados reais da tabela de preços
TRUNCATE exames CASCADE;

INSERT INTO exames (nome, descricao, valor, categoria, status) VALUES
-- Perfis
('Básico 1',            'Hemograma, ALT, FA, Creatinina',                                                              60.00,  'Perfis', 'ativo'),
('Básico 2',            'Hemograma, ALT, FA, Creatinina, Ureia',                                                       70.00,  'Perfis', 'ativo'),
('Básico 3',            'Hemograma, ALT, FA, Creatinina, Ureia, Glicose',                                              80.00,  'Perfis', 'ativo'),
('Check-up 1',          'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT',                          100.00,  'Perfis', 'ativo'),
('Check-up 2',          'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT, CT, TG, GGT',             120.00,  'Perfis', 'ativo'),
('Check-up 3',          'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT, CT, TG, GGT, CaI, Cl, K, Na, P', 140.00, 'Perfis', 'ativo'),
('Hepático 1',          'Hemograma, ALT, AST, FA, GGT',                                                               70.00,  'Perfis', 'ativo'),
('Hepático 2',          'Hemograma, ALT, AST, FA, GGT, PT, Albumina',                                                 85.00,  'Perfis', 'ativo'),
('Íons',                'Cálcio Iônico, Cloro, Potássio, Sódio, Fósforo',                                             80.00,  'Perfis', 'ativo'),
('Renal 1',             'Hemograma, Ureia, Creatinina',                                                               60.00,  'Perfis', 'ativo'),
('Renal 2',             'Hemograma, Ureia, Creatinina, Cálcio, PT',                                                   75.00,  'Perfis', 'ativo'),
('Renal 3',             'Hemograma, Ureia, Creatinina, Fósforo, PT',                                                  75.00,  'Perfis', 'ativo'),
('Renal 4',             'Hemograma, Ureia, Creatinina, Cálcio, PT, Urinálise',                                        95.00,  'Perfis', 'ativo'),
('Transfusão 1',        'Reação cruzada, Hemograma doador, Hemograma receptor',                                       135.00, 'Perfis', 'ativo'),
('Transfusão 2',        'Reação cruzada, Hemograma doador, Hemograma receptor, 3 hematócritos seriados',              160.00, 'Perfis', 'ativo'),

-- Exames Hematológicos
('Hemograma',                   NULL,                          28.00, 'Exames Hematológicos', 'ativo'),
('Hematócrito',                 NULL,                          23.00, 'Exames Hematológicos', 'ativo'),
('Contagem de Reticulócitos',   NULL,                          25.00, 'Exames Hematológicos', 'ativo'),
('Contagem de Plaquetas',       NULL,                          24.00, 'Exames Hematológicos', 'ativo'),
('Fibrinogênio (Precipitação)', NULL,                          25.00, 'Exames Hematológicos', 'ativo'),
('Proteína Plasmática',         NULL,                          23.00, 'Exames Hematológicos', 'ativo'),
('Pesquisa de Hemoparasitas',   NULL,                          24.00, 'Exames Hematológicos', 'ativo'),
('Ponta de Orelha',             NULL,                          24.00, 'Exames Hematológicos', 'ativo'),
('Reação Cruzada',              'Até 2 doadores',              85.00, 'Exames Hematológicos', 'ativo'),
('Doadores Adicionais',         'Valor por doador adicional',  30.00, 'Exames Hematológicos', 'ativo'),
('Aglutinação em Salina',       NULL,                          20.00, 'Exames Hematológicos', 'ativo'),
('Pesquisa de Microfilárias',   NULL,                          40.00, 'Exames Hematológicos', 'ativo'),

-- Exames Bioquímicos
('Albumina',         NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('ALT',              NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('AST',              NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Amilase',          NULL, 22.00, 'Exames Bioquímicos', 'ativo'),
('Cálcio',           NULL, 23.00, 'Exames Bioquímicos', 'ativo'),
('Cálcio Iônico',    NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Cloro',            NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Colesterol Total', NULL, 26.00, 'Exames Bioquímicos', 'ativo'),
('Creatinina',       NULL, 23.00, 'Exames Bioquímicos', 'ativo'),
('FA',               NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Fósforo',          NULL, 26.00, 'Exames Bioquímicos', 'ativo'),
('GGT',              NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Glicose',          NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Potássio',         NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Proteínas Totais', NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Sódio',            NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Teste de Rivalta',  NULL, 33.00, 'Exames Bioquímicos', 'ativo'),
('Triglicerídeos',   NULL, 26.00, 'Exames Bioquímicos', 'ativo'),
('Ureia',            NULL, 23.00, 'Exames Bioquímicos', 'ativo'),

-- Exames Urinários
('Urinálise',                        NULL,                   35.00, 'Exames Urinários', 'ativo'),
('RPC',                              'Relação Proteína:Creatinina', 35.00, 'Exames Urinários', 'ativo'),
('Proteína Urinária',                NULL,                   25.00, 'Exames Urinários', 'ativo'),
('Sedimentoscopia - Qualitativa',    NULL,                   27.00, 'Exames Urinários', 'ativo'),
('Análise Química - Qualitativa',    NULL,                   27.00, 'Exames Urinários', 'ativo'),
('Bacterioscopia de Urina',          NULL,                   27.00, 'Exames Urinários', 'ativo'),

-- Hemogasometria
('Hemogasometria Arterial', NULL, 160.00, 'Hemogasometria', 'ativo'),
('Hemogasometria Venosa',   NULL, 160.00, 'Hemogasometria', 'ativo'),

-- Exames Coproparasitológicos
('Tripsina Fecal',                   NULL,                              40.00, 'Exames Coproparasitológicos', 'ativo'),
('Amido Fecal',                      NULL,                              35.00, 'Exames Coproparasitológicos', 'ativo'),
('Pesquisa de Sangue Oculto',        NULL,                              33.00, 'Exames Coproparasitológicos', 'ativo'),
('OPG',                              'Ovos por grama de fezes',         27.00, 'Exames Coproparasitológicos', 'ativo'),
('Parasitológico de Fezes',          NULL,                              46.00, 'Exames Coproparasitológicos', 'ativo'),
('Amostra Adicional (Parasitológico)', NULL,                            25.00, 'Exames Coproparasitológicos', 'ativo'),

-- Plantão (taxa adicional por horário)
('Plantão',                          'Horário fora do comercial',       100.00, 'Plantão', 'ativo'),
('Plantão Especial',                 'Domingo, feriado ou após 22h',    150.00, 'Plantão', 'ativo');
