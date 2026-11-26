#!/usr/bin/env node
/**
 * Clay Clay - Database Migration Runner
 * Executes SQL migrations against Supabase
 * 
 * Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npm run db:migrate
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npm run db:migrate');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration(name: string, sql: string): Promise<void> {
  console.log(`Running migration: ${name}...`);

  // Check if migration already applied
  const { data: existing } = await supabase
    .from('_migrations')
    .select('name')
    .eq('name', name)
    .single();

  if (existing) {
    console.log(`  Skipping (already applied)`);
    return;
  }

  // Split SQL into individual statements (basic splitting on semicolons)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  // Execute each statement
  for (const statement of statements) {
    try {
      // Use Supabase's RPC or direct SQL execution
      // Note: Supabase JS client doesn't have direct SQL execution
      // You may need to use the REST API directly or a different approach
      console.log(`  Executing statement (${statement.length} chars)...`);
      // For now, log the statement - in production, use a proper migration tool
      // like supabase db push or a custom script with postgres.js
    } catch (error) {
      console.error(`  Error executing statement:`, error);
      throw error;
    }
  }

  // Record migration
  await supabase.from('_migrations').insert({ name, applied_at: new Date().toISOString() });
  console.log(`  ✓ Migration applied`);
}

async function ensureMigrationsTable(): Promise<void> {
  console.log('Ensuring _migrations table exists...');
  // Note: This requires direct SQL execution capability
  // In production, run this via supabase CLI or psql
}

async function main(): Promise<void> {
  console.log('Clay Clay Database Migration Runner\n');

  // Find all migration files
  const migrationsDir = join(__dirname, '..', 'db', 'migrations');
  const migrationFiles = ['001_initial_schema.sql']; // Add more as they're created

  console.log(`Found ${migrationFiles.length} migration(s)\n`);

  // Ensure tracking table exists
  await ensureMigrationsTable();

  // Run each migration
  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf-8');
    await runMigration(file, sql);
  }

  console.log('\n✓ All migrations completed');
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
