import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedDefaultRules, DEFAULT_AUTOMATION_RULES } from '@/lib/automations/defaultRules'
import { hasPermission } from '@/lib/rbac/permissions'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!hasPermission(profile?.role, 'automations.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await seedDefaultRules()
    return NextResponse.json({ success: true, seeded: DEFAULT_AUTOMATION_RULES.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
