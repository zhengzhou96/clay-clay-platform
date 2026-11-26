import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      status: 'error',
      message: 'Supabase credentials not configured',
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    }, { status: 500 })
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Test connection by querying a system table
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .limit(1)
    
    if (error) {
      // Check if it's a "relation doesn't exist" error (migration not run)
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return NextResponse.json({
          status: 'migration_needed',
          message: 'Database connection OK, but tables not created yet',
          error: error.message
        })
      }
      
      return NextResponse.json({
        status: 'error',
        message: 'Database query failed',
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
      employeesCount: data?.length || 0
    })
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Unknown error'
    }, { status: 500 })
  }
}
