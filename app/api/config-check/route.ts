import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 25) + '...' : null,
    hasAnonKey: !!supabaseAnonKey,
    anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : null,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0
  })
}
