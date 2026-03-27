import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

import { withTimeout } from '@/lib/supabase/with-timeout'

export async function GET() {
  try {
    const supabase = await createClient()
    const controller = new AbortController()
    
    const result: any = await withTimeout(
      supabase
        .from('messages')
        .select('id, direction, content, status, sent_at, created_at, lead_id')
        .order('created_at', { ascending: false })
        .limit(50) as any,
      10000,
      { data: [], error: null } as any,
      controller
    )

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json(result.data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
