import { getPool } from './index';
import * as bcrypt from 'bcryptjs';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERRO: seed não deve ser executado em produção.');
    process.exit(1);
  }
  const pool = getPool();

  // Limpa dados existentes para re-seed limpo
  await pool.query('TRUNCATE veterinarios, clinicas CASCADE');

  // ─── Clínicas reais (planilha 2025) ────────────────────────────────────────
  await pool.query(`
    INSERT INTO clinicas (nome, cnpj, endereco, telefone, email, status) VALUES
      ('A Vet Vai',               '124.647.539-12',      'Atendimento à Domicilio',                                                                  '(47) 9 9634-5940', 'avetvai.emcasa@gmail.com',                 'ativo'),
      ('Agro. Chico Bento',       '658.524.496-6',       'R. Dorval Marcatto, 455 - Chico de Paulo, Jaraguá do Sul - SC',                           '(47) 3370-1707',   'nicole-braz@hotmail.com',                  'ativo'),
      ('Amizade',                 '43.209.375/0001-79',  'R. Roberto Ziemann, 2181 - Amizade, Jaraguá do Sul - SC',                                 '(47) 3371-2340',   'exameshvamizade@gmail.com',                'ativo'),
      ('Autonomos',               null,                  'Atendimento à Domicilio',                                                                  null,               null,                                       'ativo'),
      ('Bea Pet Center',          '18.488.074/0001-84',  'R. Feliciano Bortolini, 1216 - 2 - Barra do Rio Cerro, Jaraguá do Sul - SC',              '(47) 9 9914-6833', 'beapetcenter@gmail.com',                   'ativo'),
      ('Bicho Urbano',            '21.804.204/0001-55',  'R. Walter Marquardt, 1269 - Barra do Rio Molha, SC',                                      '(47) 9 9214-0479', 'clinica@bichourbano.com.br',               'ativo'),
      ('Cantinho Pet',            null,                  'Rua Walter Marquardt, 2422 - Barra do Rio Molha, Jaraguá do Sul - SC',                    '(47) 3055-3056',   null,                                       'ativo'),
      ('Central Pet Vet',         '29.062.014/0001-11',  'R. Bernardo Dornbusch, 486 - Baependi, Jaraguá do Sul - SC',                              '(47) 3273-5572',   'petvetcentral@gmail.com',                  'ativo'),
      ('Clínica Vet. Corupaense', '11.021.381/0001-01',  'Rua Nereu Ramos, 113, sala 03 - Centro, Corupá - SC',                                     null,               'clinivetcorupaense@hotmail.com',           'ativo'),
      ('Clínica Vet. Schroeder',  '55.556.889/0001-80',  'R. Marechal Castelo Branco, 4400 - Centro Norte, Schroeder - SC',                        '(47) 3407-3448',   'clinicavetexames@gmail.com',               'ativo'),
      ('Dog Hair',                '111.924.514-14',      'R. Expedicionário Antônio Carlos Ferreira, 1560 - Vila Lenzi, Jaraguá do Sul - SC',       '(47) 9 9951-2315', null,                                       'ativo'),
      ('Donna Pet',               '176.610.600-5',       null,                                                                                       '(47) 9 96168407',  'donnapet.vet@gmail.com',                   'ativo'),
      ('Doutor Britto',           '21.923.629/0001-83',  'Rua XV de Novembro, 1844, sala 03 - Pomerode - SC',                                       '(47) 999157573',   'doutorbritto.vet@gmail.com',               'ativo'),
      ('Duhan Tamys',             '09.119.057/0001-89',  'R. Coronel Procópio Gomes de Oliveira, 809 - Centro, Jaraguá do Sul - SC',                '(47) 3275-1141',   'duhanjuce@netuno.com.br',                  'ativo'),
      ('Entrepatas',              '49.994.975/0001-71',  'R. Joaquim Francisco de Paulo, 2004, sala 01 - Chico de Paula, Jaraguá do Sul - SC',      '(47) 9 9932-5831', 'dreberton@outlook.com',                    'ativo'),
      ('Giacomini',               '53.618.629/0001-66',  'R. Erwin Grutzmacher, 240 - Três Rios do Sul, Jaraguá do Sul - SC',                      '(47) 9 9601-0197', 'karewgiacomini@gmail.com',                 'ativo'),
      ('LG Consultoria Vet',      '370.220.628-03',      'R. Prefeito Willy Germano Gessner, 582 - Ano Bom, Corupá - SC',                           '(47) 9 9231-3140', 'lgconsultoriaveterinaria@hotmail.com',     'ativo'),
      ('Luvet',                   '31.040.197/0001-16',  'Edifício Sônia Magali - R. Padre Alberto Romuald Jakobs, 395, sala 06 - Jaraguá do Sul', '(47) 9 8438-1843', null,                                       'inativo'),
      ('Mundo Cão',               '923.859.159-87',      'R. Olívio Domingos Brugnago, 341 - Vila Nova, Jaraguá do Sul - SC',                       '(47) 3275-0462',   'karinavet1972@gmail.com',                  'ativo'),
      ('Oncocat+dog',             '50.534.136/0001-50',  'R. Marcos Valdir Girolla, 74 - Barra do Rio Cerro, Jaraguá do Sul - SC',                 '(47) 9 9748-3171', 'marcos.medvet@hotmail.com',                'ativo'),
      ('Paraíso Canino',          '16.800.488/0001-71',  'Rua Erwino Menegotti, 960 - Agua Verde, Jaraguá do Sul - SC',                             '(47) 9 8817-0445', 'paraisocanino.consultorio@gmail.com',      'ativo'),
      ('Paulista Pets',           '41.284.946/0001-04',  'R. Erwino Menegotti, 877 - Chico de Paula, Jaraguá do Sul - SC',                         '(47) 9 9196-0014', 'paulistapetsesilvestres@gmail.com',        'ativo'),
      ('Pet Center Shop',         '04.567.595/0001-12',  'R. Gov. Jorge Lacerda, 46 - Centro, Jaraguá do Sul - SC',                                 '(47) 3372-0050',   'petcentershop@terra.com.br',               'ativo'),
      ('Petsko',                  '61.562.439-17',       'Rua João Mariano Furtado, 600, Penha - SC',                                               '(19) 9 9259-9324', 'petsko.nutrivet@gmail.com',                'ativo'),
      ('Prefeitura Schroeder',    '83.102.491/0001-09',  'R. Mal. Castelo Branco, 3201, Schroeder - SC',                                            '(47) 3374-6500',   'agricultura@schoroeder.sc.gov.br',         'ativo'),
      ('Reale',                   '15.033.071/0001-68',  'R. Marina Frutuoso, 856, Jaraguá do Sul - SC',                                            '(47) 9 8807-8933', 'clinicareal.mf@gmail.com',                 'ativo'),
      ('S.O.S Bichos',            '49.755.345/0001-44',  'Rua Waldemar Grubba, 1400 - Vila Lalau, Jaraguá do Sul - SC',                             '(47) 9 9122-7702', 'fernanda.moreeiira@gmail.com',             'ativo'),
      ('Schweitzer',              '78.977.352/0001-99',  'R. Emilio Piazera, 80 - Vila Baependi, Jaraguá do Sul - SC',                              '(47) 9 8805-0405', 'exames.schweitzer@gmail.com',              'ativo'),
      ('Sec. Agricultura',        null,                  'R. Ângelo Rubini, 586-666 - Barra do Rio Cerro, Jaraguá do Sul - SC',                    '(47) 9 9104-9585', 'claudia.feldens@jaraguadosul.sc.gov.br',   'ativo'),
      ('TrataVet',                '57.516.129/0001-74',  'Rua 28 de Agosto, 1010 - Centro, Guaramirim - SC',                                        '(47) 9 8928-7058', 'tratavet@gmail.com',                       'ativo'),
      ('Vet Móvel',               null,                  null,                                                                                       null,               null,                                       'ativo'),
      ('Vet2You',                 null,                  'R. Anton Frerichs, 641 - Rau, Jaraguá do Sul - SC',                                       '(47) 9 9213-0695', 'domicilio.vet2you@gmail.com',              'ativo'),
      ('VetVida',                 '34.405.916/0001-43',  'R. Feliciano Bortolini, 1431 - Barra do Rio Cerro, Jaraguá do Sul - SC',                  '(47) 32795453',    'vetvidajaragua@gmail.com',                 'ativo'),
      ('Vida Animal',             '47.297.045/0001-33',  'R. Manoel Henrique Borges, 264 - Costeira, Balneário Barra do Sul - SC',                 '(47) 9 9138-1606', 'vidaanimalmedvet22@gmail.com',             'ativo'),
      ('Zoo Vida',                '73.879.744/0001-00',  'R. Eugenio Nicolini, 46 - Centro, Jaraguá do Sul - SC',                                   '(47) 3017-0784',   null,                                       'ativo')
    ON CONFLICT DO NOTHING
  `);

  const { rows: clinicas } = await pool.query('SELECT id, nome FROM clinicas ORDER BY nome');
  const clinicaMap = new Map<string, string>(clinicas.map((c) => [c.nome, c.id]));
  console.log('Clínicas inseridas:', clinicas.length);

  // ─── Veterinários reais (planilha 2025) ────────────────────────────────────
  const vets: [string, string, number | null, string | null, string | null, string][] = [
    // [clinica_nome, nome, crmv, telefone, email, status]
    ['A Vet Vai',               'Amanda Oechsler',                   11199,  '(47) 9 9634-5940', 'avetvai.emcasa@gmail.com',                 'ativo'],
    ['A Vet Vai',               'Andréia Santos Japiassu',           11697,  '(47) 9 9634-5940', 'avetvai.emcasa@gmail.com',                 'ativo'],
    ['Agro. Chico Bento',       'Nicole Braz de Bona',               14075,  '(47) 9 99619736',  'nicole-braz@hotmail.com',                  'ativo'],
    ['Amizade',                 'Amanda Pozzi',                      11816,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Amanda Thomsen',                    11769,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Ana Carolina Barros',               10707,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Ana Carolina Santos',               10258,  '(47) 99274-6781',  'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Ana Letícia Kaiser',                11785,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Beatriz Anabel Freitag',            10542,  '(47) 99274-6781',  'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Beatriz Magalhães',                 13832,  '(47) 9 9165-5902', 'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Camila Valério',                    10517,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Camila Vernilli',                   14556,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Daniela Brecht de Freitas',         3411,   null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Évilin Campestri',                  8502,   null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Gabriela Ignowski',                 12141,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Guilherme Moralles',                13036,  null,               'exameshvamizade@gmail.com',                'inativo'],
    ['Amizade',                 'Jaqueline Heck',                    11122,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Juliana Velloso Pinto',             12423,  null,               'exameshvamizade@gmail.com',                'inativo'],
    ['Amizade',                 'Maria Eduarda Fortin',              14608,  null,               'exameshvamizade@gmail.com',                'ativo'],
    ['Amizade',                 'Mayara Ines Colzani',               13232,  '(47) 99274-6781',  'exameshvamizade@gmail.com',                'ativo'],
    ['Autonomos',               'Aline Cabral Silva',                13552,  '(47) 9 8489-7266', 'aliinecabrals@gmail.com',                  'inativo'],
    ['Autonomos',               'Amanda Freitas',                    7746,   '(47) 9 9107-3501', null,                                       'ativo'],
    ['Autonomos',               'Anabell Negherbon',                 14947,  '(47) 9 9200-0338', 'anabellnegherbon@gmail.com',               'ativo'],
    ['Autonomos',               'André Felipe Breda',                8250,   '(47) 9 9647-1310', 'andrefbac@gmail.com',                      'ativo'],
    ['Autonomos',               'Anna Karina',                       9142,   null,               'vetannakarina@gmail.com',                  'ativo'],
    ['Autonomos',               'Aracely Vilugron',                  11000,  '(44) 9 8816-8549', null,                                       'inativo'],
    ['Autonomos',               'Beatriz Claas Ronchi',              9677,   '(47) 9 9779-7203', 'claasbeatriz@gmail.com',                   'ativo'],
    ['Autonomos',               'Camila Pereto',                     11739,  '(47) 9 9113-6755', null,                                       'inativo'],
    ['Autonomos',               'Charlene Longhi',                   9904,   '(47) 9 9971-5930', 'charlenelonghi@gmail.com',                 'ativo'],
    ['Autonomos',               'Daniela Lima',                      10532,  null,               null,                                       'ativo'],
    ['Autonomos',               'Dian Carlos Borges',                13708,  '(47) 9 8416-6530', 'dian.carlosborges@gmail.com',              'ativo'],
    ['Autonomos',               'Diego Cazangi',                     7353,   '(47) 9 9976-5600', null,                                       'ativo'],
    ['Autonomos',               'Dieiv dos Santos',                  10599,  '(47) 9 9637-0877', 'dieivvet@gmail.com',                       'ativo'],
    ['Autonomos',               'Fernanda Souza',                    11980,  null,               null,                                       'inativo'],
    ['Autonomos',               'Gabriel Reiter',                    12386,  null,               null,                                       'inativo'],
    ['Autonomos',               'Guilherme Bueno',                   11491,  null,               null,                                       'inativo'],
    ['Autonomos',               'Jamile Jeannie Caovila',            3754,   null,               null,                                       'ativo'],
    ['Autonomos',               'Jean Vicari',                       6801,   null,               null,                                       'ativo'],
    ['Autonomos',               'Jenifer Mohr',                      10603,  '(47) 9 8827-1457', null,                                       'inativo'],
    ['Autonomos',               'Juliana Zanghelini',                5654,   '(47) 9 9712-1255', 'juzanghelini@hotmail.com',                 'ativo'],
    ['Autonomos',               'Karin Witt',                        7073,   '(47) 9 8833-2973', 'wkarin@terra.com.br',                      'ativo'],
    ['Autonomos',               'Katia Fernandes',                   9593,   null,               null,                                       'inativo'],
    ['Autonomos',               'Keice Pantoja',                     15088,  '(47) 9 8893-7966', 'keicemonnya.vet@gmail.com',                'ativo'],
    ['Autonomos',               'Kira Agostini',                     5762,   null,               null,                                       'ativo'],
    ['Autonomos',               'Ligia Mendes',                      8546,   '(16) 9 8160-5158', null,                                       'ativo'],
    ['Autonomos',               'Luiza Dalpisol',                    13510,  '(55) 99188-6373',  'luizadalpisolvet@gmail.com',               'ativo'],
    ['Autonomos',               'Maiara Postai',                     7337,   '(47) 9 9127-9988', 'maiarapostai.vet@gmail.com',               'ativo'],
    ['Autonomos',               'Maria Eduarda',                     12743,  null,               null,                                       'inativo'],
    ['Autonomos',               'Mariana Medeiros',                  9523,   null,               null,                                       'ativo'],
    ['Autonomos',               'Mariane Safons',                    8757,   null,               null,                                       'ativo'],
    ['Autonomos',               'Meyre Jheime dos Santos',           null,   null,               null,                                       'inativo'],
    ['Autonomos',               'Milena Bido',                       11411,  '(47) 9 9776-2827', null,                                       'inativo'],
    ['Autonomos',               'Nayara Muller Rudiger',             11322,  '(47) 99628-6513',  'medvet.nayara@gmail.com',                  'ativo'],
    ['Autonomos',               'Rafael Vieira',                     5000,   '(47) 9 9734-3354', null,                                       'ativo'],
    ['Autonomos',               'Regina Muniz',                      7111,   '(47) 9 8407-5076', 'reginacffm@gmail.com',                     'ativo'],
    ['Autonomos',               'Renata Leitzke',                    7336,   '(47) 9 8854-1574', null,                                       'ativo'],
    ['Autonomos',               'Sabrina Kelly',                     2911,   '(47) 9 8807-8933', null,                                       'inativo'],
    ['Autonomos',               'Tailana Cristina de Borba',         6715,   null,               null,                                       'ativo'],
    ['Bea Pet Center',          'Eduarda Krause',                    11342,  '(47) 9 9914-6833', 'beapetcenter@gmail.com',                   'inativo'],
    ['Bea Pet Center',          'Gislayne Costamilam',               11386,  '(47) 9 9914-6833', null,                                       'inativo'],
    ['Bea Pet Center',          'Gleici Alves Pereira',              12464,  null,               'gleicialves.vet@gmail.com',                'ativo'],
    ['Bea Pet Center',          'Michael Neves',                     4273,   '(47) 9 9914-6833', 'beapetcenter@gmail.com',                   'ativo'],
    ['Bicho Urbano',            'Ana Laura Ramos Araldi',            15254,  null,               null,                                       'ativo'],
    ['Bicho Urbano',            'Bruna Alflen',                      12578,  '(47) 9 8491-4669', null,                                       'inativo'],
    ['Bicho Urbano',            'Eduarda Pinheiro',                  11245,  '(47) 9 9900-6606', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Fabiana Ferreira',                  12210,  null,               'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Fabianna Garcia',                   5817,   '(47) 9 9973-9621', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Flávia Daiane Rocha',               12871,  null,               null,                                       'ativo'],
    ['Bicho Urbano',            'Gabriely Moura',                    12438,  '(47) 9 8867-3544', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Julia Alvarez',                     14436,  null,               null,                                       'ativo'],
    ['Bicho Urbano',            'Juliana Fischer',                   4564,   '(47) 9 9674-1880', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Leticia Deretti',                   12484,  '(47) 9 9725-3649', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Marina Pértile',                    11259,  '(46) 9 9135-7102', 'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Natasha Zilz',                      14482,  null,               null,                                       'inativo'],
    ['Bicho Urbano',            'Rafaela Dupim',                     11084,  null,               'clinica@bichourbano.com.br',               'ativo'],
    ['Bicho Urbano',            'Tamara dos Santos',                 11387,  null,               null,                                       'ativo'],
    ['Cantinho Pet',            'Felipe Moreira',                    11786,  '(47) 9 9210-4064', null,                                       'ativo'],
    ['Central Pet Vet',         'Natasha Linke',                     12453,  null,               'petvetcentral@gmail.com',                  'ativo'],
    ['Clínica Vet. Corupaense', 'Anelise Kramer',                    7892,   '(47) 9 9703-0223', 'clinivetcorupaense@hotmail.com',           'ativo'],
    ['Clínica Vet. Corupaense', 'Bruna Rueckl',                      6627,   null,               'clinivetcorupaense@hotmail.com',           'ativo'],
    ['Clínica Vet. Corupaense', 'Lucas Kasmirski',                   6269,   '(47) 99643-0899',  'clinivetcorupaense@hotmail.com',           'ativo'],
    ['Clínica Vet. Schroeder',  'Bruna Marcieli M. Lendzion',        11668,  '(49) 9 9920-7901', 'clinicavetschroeder@gmail.com',            'ativo'],
    ['Clínica Vet. Schroeder',  'João Gabriel Lendzion',             11542,  null,               'clinicavetschroeder@gmail.com',            'ativo'],
    ['Donna Pet',               'Adriana Guimarães',                 12769,  '(47) 9 96168407',  'donnapet.vet@gmail.com',                   'ativo'],
    ['Doutor Britto',           'Carlos Eduardo de Britto',          1973,   '(47) 9 99157573',  'doutorbritto.vet@gmail.com',               'ativo'],
    ['Duhan Tamys',             'Caroline D. da Silva',              6832,   null,               null,                                       'ativo'],
    ['Duhan Tamys',             'Elizandra Regina G. Mafra',         2368,   '(47) 9 9916-7830', null,                                       'ativo'],
    ['Duhan Tamys',             'Mayara Hock',                       11551,  null,               null,                                       'ativo'],
    ['Entrepatas',              'Eberton Henrique',                  9923,   '(47) 9 9932-5831', 'dreberton@outlook.com',                    'ativo'],
    ['Giacomini',               'Karen Giacomini',                   13685,  '(47) 9 9601-0197', 'karewgiacomini@gmail.com',                 'ativo'],
    ['LG Consultoria Vet',      'Leandro Gonzalez',                  5664,   '(47) 9 9231-3140', 'lgconsultoriaveterinaria@hotmail.com',     'ativo'],
    ['Luvet',                   'Luciana Cervo',                     4156,   null,               null,                                       'inativo'],
    ['Luvet',                   'Thais Pilz',                        11554,  null,               null,                                       'inativo'],
    ['Mundo Cão',               'Karina Schuster',                   1712,   '(47) 9 9609-1981', 'karinavet1972@gmail.com',                  'ativo'],
    ['Oncocat+dog',             'Caio Souza',                        60239,  null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Oncocat+dog',             'Marcos de Souza',                   12782,  '(47) 9 9748-3171', 'marcos.medvet@hotmail.com',                'ativo'],
    ['Paulista Pets',           'Fernanda Letycia Lenzi',            8892,   null,               null,                                       'ativo'],
    ['Pet Center Shop',         'Gracielle de Andrade',              3607,   '(47) 9 9181-8571', 'petcentershop@terra.com.br',               'ativo'],
    ['Petsko',                  'Iana Caroline F. de Oliveira',      11510,  '(19) 9 9259-9324', 'petsko.nutrivet@gmail.com',                'ativo'],
    ['Prefeitura Schroeder',    'Kamile Negherbon',                  3587,   '(47) 9 9770-4231', 'kamilem@schoroeder.sc.gov.br',             'ativo'],
    ['Reale',                   'Ana Minati',                        11748,  null,               null,                                       'ativo'],
    ['Reale',                   'Analu Berlandi',                    7694,   null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Reale',                   'Daniella Eloí Pradi',               10840,  null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Reale',                   'Eloísa Steffens',                   8659,   null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Reale',                   'Fernanda Viebrantz',                13392,  null,               null,                                       'ativo'],
    ['Reale',                   'Gabriela Basquiroto',               8867,   null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Reale',                   'Giovanna Bakó',                     5066,   '(47) 9 9203-6224', null,                                       'ativo'],
    ['Reale',                   'Larissa Tomelin',                   10607,  '(47) 9 8825-3418', 'larissa.tomelin2@gmail.com',               'ativo'],
    ['Reale',                   'Raquel Vasquez Leite',              12679,  null,               'clinicareal.mf@gmail.com',                 'ativo'],
    ['Reale',                   'Sandy Salvador',                    14841,  null,               null,                                       'ativo'],
    ['Reale',                   'Tainara Simon Girardi',             12444,  null,               null,                                       'ativo'],
    ['S.O.S Bichos',            'Fernanda Moreira',                  12364,  '(47) 9 9122-7702', 'fernanda.moreeiira@gmail.com',             'ativo'],
    ['Schweitzer',              'Fernando Candido',                  13603,  null,               'clinicavetschweitzer@gmail.com',           'ativo'],
    ['Schweitzer',              'Leticia Pereira',                   10596,  null,               'clinicavetschweitzer@gmail.com',           'ativo'],
    ['Schweitzer',              'Natália Assini',                    9296,   null,               'clinicavetschweitzer@gmail.com',           'ativo'],
    ['Schweitzer',              'Thômina Schweitzer',                6487,   '(47) 9 8805-0405', 'clinicavetschweitzer@gmail.com',           'ativo'],
    ['Schweitzer',              'Valdemar Schweitzer',               968,    '(47) 9 8805-0405', 'clinicavetschweitzer@gmail.com',           'ativo'],
    ['Sec. Agricultura',        'Claudia Feldens',                   6207,   '(47) 9 9660-9615', 'claudia.feldens@jaraguadosul.sc.gov.br',   'ativo'],
    ['Sec. Agricultura',        'Fernanda Argenton',                 12663,  '(41) 9 9104-9585', 'fe.argenton@gmail.com',                    'ativo'],
    ['Sec. Agricultura',        'Renan Fiel',                        15099,  '(61) 99610-4445',  null,                                       'ativo'],
    ['TrataVet',                'Gabriela Niel',                     12713,  '(47) 9 8928-7058', 'tratavet@gmail.com',                       'ativo'],
    ['Vet2You',                 'Francini Peixer Negrão',            13586,  '(47) 9 9213-0695', 'domicilio.vet2you@gmail.com',              'ativo'],
    ['VetVida',                 'Michele de Assunção',               7859,   '(47) 9 9688-4474', 'vetvidajaragua@gmail.com',                 'ativo'],
    ['Vida Animal',             'Bruna Elisa Neves',                 11484,  null,               null,                                       'ativo'],
    ['Vida Animal',             'Mateus Venturi Essig',              10810,  null,               null,                                       'ativo'],
    ['Vida Animal',             'Vanessa Afonso Schubert',           11300,  null,               null,                                       'ativo'],
    ['Zoo Vida',                'Anelise Lehmann',                   1125,   null,               null,                                       'ativo'],
  ];

  let vetsInseridos = 0;
  for (const [clinicaNome, nome, crmv, telefone, email, status] of vets) {
    const clinicaId = clinicaMap.get(clinicaNome);
    if (!clinicaId) {
      console.warn(`  Clínica não encontrada para vet: ${nome} (${clinicaNome})`);
      continue;
    }
    if (crmv === null) continue; // crmv NOT NULL na tabela
    const crmvStr = `SC-${crmv}`;
    await pool.query(
      `INSERT INTO veterinarios (clinica_id, nome, crmv, telefone, email, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (crmv) DO NOTHING`,
      [clinicaId, nome, crmvStr, telefone, email, status],
    );
    vetsInseridos++;
  }
  console.log(`Veterinários inseridos: ${vetsInseridos}`);

  // ─── Usuário admin ──────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash('vertere@2026', 10);
  await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, papel)
     VALUES ('Administrador', 'admin@verterelab.com', $1, 'superadmin')
     ON CONFLICT (email) DO NOTHING`,
    [senhaHash],
  );

  console.log('Seed completo!');
  console.log('  Login: admin@verterelab.com / vertere@2026');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
