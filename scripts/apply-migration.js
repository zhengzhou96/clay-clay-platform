import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log('Connecting to Supabase...');
  
  const client = await pool.connect();
  
  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'db/migrations/002_staff_scheduling.sql');
    const migration = readFileSync(migrationPath, 'utf-8');
    
    console.log('Running migration...');
    await client.query('BEGIN');
    await client.query(migration);
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
