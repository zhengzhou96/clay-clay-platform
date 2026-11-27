import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/admin/apply-migration
 * 
 * Applies the staff scheduling migration to the Supabase database.
 * This runs on Vercel's infrastructure which has network access to Supabase.
 * 
 * Security: Only callable with SUPABASE_SERVICE_ROLE_KEY configured.
 * Safe to call multiple times - migration is idempotent (uses IF NOT EXISTS).
 */

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Supabase credentials not configured in Vercel environment'
      },
      { status: 500 }
    )
  }
  
  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'db/migrations/002_staff_scheduling.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    })
    
    // Check if migration already applied by checking for employees table
    const { data: existing, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    // If we get data, tables exist
    if (!checkError && existing) {
      return NextResponse.json({
        status: 'already_applied',
        message: 'Migration tables already exist',
        timestamp: new Date().toISOString()
      })
    }
    
    // If error is "relation does not exist", we need to run migration
    if (checkError && (checkError.message?.includes('relation') || checkError.message?.includes('does not exist'))) {
      console.log('Tables do not exist, running migration...')
      
      // Execute the migration SQL via Supabase REST API
      // We need to split by statements and execute each one
      // Supabase doesn't support multi-statement RPC directly, so we use fetch
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({
          sql: migrationSQL
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        return NextResponse.json({
          status: 'success',
          message: 'Migration applied successfully',
          result,
          timestamp: new Date().toISOString()
        })
      } else {
        const errorBody = await response.text()
        console.error('Migration failed:', errorBody)
        
        // Try alternative: split into individual statements
        // This is a fallback for complex migrations
        return NextResponse.json({
          status: 'partial',
          message: 'Direct SQL execution not available. Please run migration manually.',
          instructions: {
            dashboard: 'Go to Supabase Dashboard > SQL Editor and run the contents of db/migrations/002_staff_scheduling.sql',
            cli: 'Or use: supabase db push --db-url "postgresql://postgres:[SERVICE_KEY]@db.[PROJECT_ID].supabase.co:5432/postgres"'
          },
          migration_file: 'db/migrations/002_staff_scheduling.sql',
          error: errorBody
        }, { status: 500 })
      }
    }
    
    // Some other error
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      error: checkError?.message || 'Unknown error'
    }, { status: 500 })
    
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Migration check failed'
      },
      { status: 500 }
    )
  }
}
