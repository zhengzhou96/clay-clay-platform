
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fs = require('fs');
const path = require('path');

async function runMigration() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'db/migrations/002_staff_scheduling.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (stmt) {
            try {
                const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
                if (error) {
                    console.error(`Statement ${i + 1} failed:`, error.message);
                } else {
                    console.log(`Statement ${i + 1}: OK`);
                }
            } catch (e) {
                console.error(`Statement ${i + 1} error:`, e.message);
            }
        }
    }
    
    console.log('Migration complete');
}

runMigration().catch(console.error);
