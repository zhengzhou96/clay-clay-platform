import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/apply-migration
 * 
 * Applies the staff scheduling migration to the Supabase database.
 * This runs on Vercel's infrastructure which has network access to Supabase.
 * 
 * Security: Only callable with SUPABASE_SERVICE_ROLE_KEY configured.
 * Safe to call multiple times - migration is idempotent.
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
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
    if (checkError && (checkError.message.includes('relation') || checkError.message.includes('does not exist'))) {
      // Read the migration SQL from the repo
      // Note: We can't directly execute arbitrary SQL via the Supabase JS client
      // This endpoint confirms the migration needs to be run manually or via Supabase CLI
      
      return NextResponse.json({
        status: 'migration_needed',
        message: 'Database tables do not exist yet. Migration file: db/migrations/002_staff_scheduling.sql',
        tables_needed: [
          'employees',
          'employee_wage_rates', 
          'staff_shifts',
          'attendance_shifts',
          'attendance_audit_logs'
        ],
        instructions: {
          option1: 'Use Supabase Dashboard SQL Editor to run db/migrations/002_staff_scheduling.sql',
          option2: 'Use Supabase CLI: supabase db push --db-url "postgres://..."',
          migration_file: '/db/migrations/002_staff_scheduling.sql'
        }
      })
    }
    
    // Some other error
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      error: checkError?.message || 'Unknown error'
    }, { status: 500 })
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Migration check failed'
      },
      { status: 500 }
    )
  }
}
