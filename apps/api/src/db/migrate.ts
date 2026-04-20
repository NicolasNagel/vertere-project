import * as fs from 'fs';
import * as path from 'path';
import { getPool } from './index';

async function migrate() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      ran_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: ran } = await pool.query(`SELECT filename FROM _migrations`);
  const ranSet = new Set(ran.map((r: { filename: string }) => r.filename));

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (ranSet.has(file)) {
      console.log(`  skip ${file} (already ran)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    await pool.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [file]);
    console.log(`  ✓ ${file}`);
  }

  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
