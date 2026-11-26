import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      status: 'error',
      message: 'Credentials not configured',
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    }, { status: 500 })
  }
  
  try {
    // Try direct fetch to Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    const status = response.status
    const body = await response.text()
    
    return NextResponse.json({
      status: status === 200 ? 'ok' : 'error',
      http_status: status,
      url: supabaseUrl,
      response_preview: body.substring(0, 200)
    })
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Fetch failed',
      error_type: error.constructor?.name,
      error_cause: error.cause?.message || 'Unknown'
    }, { status: 500 })
  }
}
