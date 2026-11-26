import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const connectionString = process.env.DIRECT_POSTGRES_URL;
    
    if (!connectionString) {
        console.error('Error: DIRECT_POSTGRES_URL not set');
        process.exit(1);
    }
    
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('Connected to database');
        
        const migrationPath = path.join(__dirname, '../db/migrations/002_staff_scheduling.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migrationSql);
        console.log('✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('Detail:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
