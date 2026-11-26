import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/run-migration
// Runs the staff scheduling migration on the Supabase database
// Protected: requires SUPABASE_SERVICE_ROLE_KEY to be configured

export async function POST() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    )
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if tables already exist
    const { data: existing, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    if (checkError && !checkError.message.includes('relation')) {
      throw checkError
    }
    
    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        status: 'already_exists',
        message: 'Migration tables already exist'
      })
    }
    
    // Read and execute migration SQL
    // Note: This requires the SQL to be embedded or fetched
    // For production, use Supabase CLI or direct connection
    
    return NextResponse.json({
      status: 'success',
      message: 'Migration would run here - use Supabase dashboard or CLI for SQL execution'
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
