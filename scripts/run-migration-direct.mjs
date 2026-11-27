import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const migrationPath = join(__dirname, '../db/migrations/002_staff_scheduling.sql');
    const migration = readFileSync(migrationPath, 'utf-8');
    console.log('Starting migration...');
    console.log(`Migration file: ${migrationPath}`);
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('SUCCESS: Migration applied!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('FAILED:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

run();
