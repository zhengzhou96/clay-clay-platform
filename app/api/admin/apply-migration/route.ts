import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * POST /api/admin/apply-migration
 * 
 * Applies the staff scheduling migration to the Supabase database.
 * Uses direct REST API calls to avoid schema cache issues.
 * 
 * Security: Requires SUPABASE_SERVICE_ROLE_KEY in environment.
 * Safe to call multiple times - migration is idempotent (uses IF NOT EXISTS).
 */

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Supabase credentials not configured'
      },
      { status: 500 }
    )
  }
  
  try {
    // Check if tables exist via REST API (bypasses schema cache)
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/employees?select=id&limit=1`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (checkResponse.ok) {
      return NextResponse.json({
        status: 'already_applied',
        message: 'Migration tables already exist',
        timestamp: new Date().toISOString()
      })
    }
    
    const checkError = await checkResponse.json().catch(() => ({}))
    
    // If table doesn't exist, run migration
    if (checkResponse.status === 404 || checkError.code === 'PGRST102') {
      console.log('Tables do not exist, running migration...')
      
      // Read the migration SQL
      const migrationPath = join(process.cwd(), 'db/migrations/002_staff_scheduling.sql')
      const migrationSQL = readFileSync(migrationPath, 'utf-8')
      
      // Try to execute via Supabase's SQL endpoint
      const execResponse = await fetch(`${supabaseUrl}/admin/api/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          query: migrationSQL
        })
      })
      
      if (execResponse.ok) {
        return NextResponse.json({
          status: 'success',
          message: 'Migration applied successfully',
          timestamp: new Date().toISOString()
        })
      }
      
      const execError = await execResponse.text()
      console.error('SQL execution failed:', execError)
      
      return NextResponse.json({
        status: 'manual_required',
        message: 'Automatic migration not available. Please run SQL manually.',
        instructions: {
          dashboard: 'Supabase Dashboard > SQL Editor: Run contents of db/migrations/002_staff_scheduling.sql',
          migration_file: 'db/migrations/002_staff_scheduling.sql'
        },
        error: execError
      }, { status: 500 })
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Database check failed',
      error: checkError
    }, { status: 500 })
    
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        status: 'error',
        message: error.message || 'Migration failed'
      },
      { status: 500 }
    )
  }
}
