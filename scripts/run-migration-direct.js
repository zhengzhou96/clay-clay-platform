const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const migration = fs.readFileSync(path.join(__dirname, 'db/migrations/002_staff_scheduling.sql'), 'utf-8');
    console.log('Starting migration...');
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    console.log('SUCCESS: Migration applied!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('FAILED:', err.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

run();
