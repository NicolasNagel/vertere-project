import { getPool } from './index';

async function seed() {
  const pool = getPool();

  await pool.query(`
    INSERT INTO clinicas (nome, cnpj, endereco, telefone, email) VALUES
      ('Clínica VetBem', '12.345.678/0001-90', 'Rua das Flores, 100 - São Paulo/SP', '(11) 3000-1000', 'contato@vetbem.com.br'),
      ('Hospital Veterinário Central', '98.765.432/0001-10', 'Av. Brasil, 500 - Rio de Janeiro/RJ', '(21) 3000-2000', 'contato@hvcentral.com.br'),
      ('PetCare Saúde Animal', '55.444.333/0001-22', 'Rua Augusta, 200 - Curitiba/PR', '(41) 3000-3000', 'contato@petcare.com.br')
    ON CONFLICT (cnpj) DO NOTHING
  `);

  const { rows: clinicas } = await pool.query('SELECT id, nome FROM clinicas ORDER BY nome');
  console.log('Clinicas:', clinicas.map((c) => c.nome));

  await pool.query(`
    INSERT INTO veterinarios (clinica_id, nome, crmv, telefone, email) VALUES
      ($1, 'Dr. Ana Paula Silva', 'CRMV-SP-12345', '(11) 99000-1001', 'ana.silva@vetbem.com.br'),
      ($1, 'Dr. Carlos Mendes', 'CRMV-SP-12346', '(11) 99000-1002', 'carlos.mendes@vetbem.com.br'),
      ($2, 'Dra. Fernanda Costa', 'CRMV-RJ-22222', '(21) 99000-2001', 'fernanda.costa@hvcentral.com.br'),
      ($2, 'Dr. Roberto Lima', 'CRMV-RJ-22223', '(21) 99000-2002', 'roberto.lima@hvcentral.com.br'),
      ($3, 'Dra. Juliana Rocha', 'CRMV-PR-33333', '(41) 99000-3001', 'juliana.rocha@petcare.com.br')
    ON CONFLICT (crmv) DO NOTHING
  `, [clinicas[0].id, clinicas[1].id, clinicas[2].id]);

  await pool.query(`
    INSERT INTO exames (nome, descricao, valor) VALUES
      ('Hemograma Completo', 'Avaliação das células sanguíneas', 45.00),
      ('Bioquímica Sérica', 'Dosagem de glicose, ureia, creatinina e ALT', 80.00),
      ('Urinálise', 'Análise física, química e microscópica da urina', 35.00),
      ('Radiografia Simples', 'Radiografia digital de uma região', 120.00),
      ('Ultrassonografia Abdominal', 'Ultrassom abdominal completo', 180.00),
      ('Parasitológico de Fezes', 'Exame parasitológico de fezes - método de flutuação', 30.00),
      ('Citologia', 'Coleta e análise citológica', 60.00),
      ('Cultura e Antibiograma', 'Cultura bacteriana com teste de sensibilidade', 95.00),
      ('PCR Cinomose/Parvovirose', 'Diagnóstico molecular por PCR', 150.00),
      ('Ecocardiograma', 'Avaliação cardíaca por ultrassom', 220.00)
    ON CONFLICT DO NOTHING
  `);

  console.log('Seed completo! 3 clínicas, 5 veterinários, 10 exames inseridos.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
