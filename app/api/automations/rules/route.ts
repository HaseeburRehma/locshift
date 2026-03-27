import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: false })
  
  return NextResponse.json(rules || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!hasPermission(profile?.role, 'automations.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { error } = await supabase.from('automation_rules').insert({ ...body, created_by: user.id })
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!hasPermission(profile?.role, 'automations.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, ...fields } = await request.json()
  const { error } = await supabase.from('automation_rules').update(fields).eq('id', id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!hasPermission(profile?.role, 'automations.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  const { error } = await supabase.from('automation_rules').delete().eq('id', id)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
