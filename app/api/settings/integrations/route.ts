import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'settings.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { provider, api_key, api_url, is_active } = await request.json()

    // Upsert integration config
    const { data: existing } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('provider', provider)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('integration_configs')
        .update({
          api_key,
          api_url,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('integration_configs')
        .insert({
          provider,
          api_key,
          api_url,
          is_active
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    return NextResponse.json({ success: true, config: result.data })

  } catch (error: any) {
    console.error('[api/settings/integrations] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
