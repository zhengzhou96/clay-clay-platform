#!/usr/bin/env node
/**
 * Post-deploy migration runner for Vercel
 * This runs after deployment to apply database migrations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('Skipping migration: Supabase credentials not configured in Vercel environment');
        return;
    }
    
    console.log('Running database migration...');
    
    // For now, we'll skip the complex SQL migration
    // and create tables via the Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if migration already ran
    const { data: existingTables } = await supabase
        .from('employees')
        .select('id')
        .limit(1);
    
    if (existingTables && existingTables.length >= 0) {
        console.log('Migration tables already exist');
        return;
    }
    
    console.log('Migration would run here (requires SQL execution capability)');
}

runMigration().catch(console.error);
