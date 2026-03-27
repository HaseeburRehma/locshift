import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Upsert company settings (assume only one row exists or create if none)
    const { data: existing } = await supabase.from('company_settings').select('id').maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('company_settings')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      result = await supabase
        .from('company_settings')
        .insert({
          ...body,
          id: crypto.randomUUID()
        })
    }

    if (result.error) throw result.error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[api/settings/company] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
