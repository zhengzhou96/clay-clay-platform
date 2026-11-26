import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('Error: POSTGRES_URL_NON_POOLING or DATABASE_URL not set');
        process.exit(1);
    }
    
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('Connected to database');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../db/migrations/002_staff_scheduling.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the entire migration
        await client.query(migrationSql);
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) {
            console.error('Detail:', error.detail);
        }
        if (error.hint) {
            console.error('Hint:', error.hint);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
