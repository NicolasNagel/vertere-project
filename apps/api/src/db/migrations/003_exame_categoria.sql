ALTER TABLE exames ADD COLUMN IF NOT EXISTS categoria VARCHAR(100);

-- Limpa dados de seed e substitui pelos dados reais da tabela de preços
TRUNCATE exames CASCADE;

INSERT INTO exames (nome, descricao, valor, categoria, status) VALUES
-- Perfis
('Básico 1',        'Hemograma, ALT, FA, Creatinina',                                                                     45.00,  'Perfis', 'ativo'),
('Básico 2',        'Hemograma, ALT, FA, Creatinina, Ureia',                                                              60.00,  'Perfis', 'ativo'),
('Básico 3',        'Hemograma, ALT, FA, Creatinina, Ureia, Glicose',                                                     70.00,  'Perfis', 'ativo'),
('Check-up 1',      'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT',                                 100.00,  'Perfis', 'ativo'),
('Check-up 2',      'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT, CT, TG, GGT',                   120.00,  'Perfis', 'ativo'),
('Check-up 3',      'Hemograma, ALT, AST, FA, Ureia, Creatinina, Glicose, Albumina, PT, CT, TG, GGT, CaI, Cl, K, Na, P', 140.00, 'Perfis', 'ativo'),
('Hepático 1',      'Hemograma, ALT, AST, FA, GGT',                                                                       60.00,  'Perfis', 'ativo'),
('Hepático 2',      'Hemograma, ALT, AST, FA, GGT, PT, Albumina',                                                         75.00,  'Perfis', 'ativo'),
('Íons',            'Cálcio Iônico, Cloro, Potássio, Sódio, Fósforo',                                                     80.00,  'Perfis', 'ativo'),
('Renal 1',         'Hemograma, Ureia, Creatinina',                                                                        45.00,  'Perfis', 'ativo'),
('Renal 2',         'Hemograma, Ureia, Creatinina, Cálcio, PT',                                                            60.00,  'Perfis', 'ativo'),
('Renal 3',         'Hemograma, Ureia, Creatinina, Fósforo, PT',                                                           60.00,  'Perfis', 'ativo'),
('Renal 4',         'Hemograma, Ureia, Creatinina, Cálcio, PT, Urinálise',                                                 80.00,  'Perfis', 'ativo'),
('Transfusão 1',    'Reação cruzada, Hemograma doador, Hemograma receptor',                                               120.00,  'Perfis', 'ativo'),
('Transfusão 2',    'Reação cruzada, Hemograma doador, Hemograma receptor, 3 hematócritos seriados',                     140.00,  'Perfis', 'ativo'),

-- Exames Hematológicos
('Hemograma',                   NULL,                          25.00, 'Exames Hematológicos', 'ativo'),
('Hematócrito',                 NULL,                          16.00, 'Exames Hematológicos', 'ativo'),
('Contagem de Reticulócitos',   NULL,                          22.00, 'Exames Hematológicos', 'ativo'),
('Contagem de Plaquetas',       NULL,                          17.00, 'Exames Hematológicos', 'ativo'),
('Fibrinogênio (Precipitação)', NULL,                          25.00, 'Exames Hematológicos', 'ativo'),
('Proteína Plasmática',         NULL,                          20.00, 'Exames Hematológicos', 'ativo'),
('Pesquisa de Hemoparasitas',   NULL,                          20.00, 'Exames Hematológicos', 'ativo'),
('Ponta de Orelha',             NULL,                          16.00, 'Exames Hematológicos', 'ativo'),
('Reação Cruzada',              'Até 2 doadores',              75.00, 'Exames Hematológicos', 'ativo'),
('Doadores Adicionais',         'Valor por doador adicional',  30.00, 'Exames Hematológicos', 'ativo'),
('Aglutinação em Salina',       NULL,                          20.00, 'Exames Hematológicos', 'ativo'),
('Pesquisa de Microfilárias',   NULL,                          40.00, 'Exames Hematológicos', 'ativo'),
('FIV/FELV',                    NULL,                         130.00, 'Exames Hematológicos', 'ativo'),
('Hemogasometria Arterial',     NULL,                         160.00, 'Exames Hematológicos', 'ativo'),
('Hemogasometria Venosa',       NULL,                         160.00, 'Exames Hematológicos', 'ativo'),

-- Exames Bioquímicos
('Albumina',                 NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Alanina Aminotransferase', NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Aspartato Aminotransferase', NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Amilase',                  NULL, 22.00, 'Exames Bioquímicos', 'ativo'),
('Cálcio',                   NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Cálcio Iônico',            NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Cloro',                    NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Colesterol Total',         NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Creatinina',               NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Fosfatase Alcalina',       NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Fósforo',                  NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Gama Glutamil Transferase', NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Glicose',                  NULL, 10.00, 'Exames Bioquímicos', 'ativo'),
('Potássio',                 NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Proteínas Totais',         NULL, 15.00, 'Exames Bioquímicos', 'ativo'),
('Sódio',                    NULL, 35.00, 'Exames Bioquímicos', 'ativo'),
('Teste de Rivalta',         NULL, 33.00, 'Exames Bioquímicos', 'ativo'),
('Triglicerídeos',           NULL, 17.00, 'Exames Bioquímicos', 'ativo'),
('Ureia',                    NULL, 20.00, 'Exames Bioquímicos', 'ativo'),
('Centrifugação',            'Por amostra', 5.00, 'Exames Bioquímicos', 'ativo'),
('Taxa de Coleta',           NULL, 15.00, 'Exames Bioquímicos', 'ativo'),

-- Exames Urinários
('Urinálise',         NULL,                          25.00, 'Exames Urinários', 'ativo'),
('Relação Proteína:Creatinina', NULL,                25.00, 'Exames Urinários', 'ativo'),
('Proteína Urinária', NULL,                          17.00, 'Exames Urinários', 'ativo'),
('Sedimentoscopia',   NULL,                          15.00, 'Exames Urinários', 'ativo'),
('Análise Química',   NULL,                          15.00, 'Exames Urinários', 'ativo'),
('Fita Urinária',     NULL,                          15.00, 'Exames Urinários', 'ativo'),

-- Exames Coproparasitológicos
('Tripsina Fecal',                    NULL,                           40.00, 'Exames Coproparasitológicos', 'ativo'),
('Amido Fecal',                       NULL,                           35.00, 'Exames Coproparasitológicos', 'ativo'),
('Pesquisa de Sangue Oculto',         NULL,                           33.00, 'Exames Coproparasitológicos', 'ativo'),
('Ovos Por Grama',                    'Ovos por grama de fezes',      27.00, 'Exames Coproparasitológicos', 'ativo'),
('Parasitológico de Fezes',           NULL,                           46.00, 'Exames Coproparasitológicos', 'ativo'),
('Amostra Adicional (Parasitológico)', NULL,                          25.00, 'Exames Coproparasitológicos', 'ativo'),

-- Terceirizados
('Cultura e Antibiograma',                    NULL, 150.00, 'Terceirizados', 'ativo'),
('Cultura Fúngica - Dermatófitos e Leveduras', NULL, 77.00, 'Terceirizados', 'ativo'),

-- Plantão (taxa adicional por horário)
('Plantão',         'Horário fora do comercial',    100.00, 'Plantão', 'ativo'),
('Plantão Especial', 'Domingo, feriado ou após 22h', 150.00, 'Plantão', 'ativo');
