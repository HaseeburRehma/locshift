import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    8000,
    { data: { user: null }, error: null as any }
  )

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check auth level
  const { data: profile } = await withTimeout(
    supabase.from('profiles').select('role').eq('id', user.id).single() as any,
    8000,
    { data: null, error: null } as any
  )
  
  if (!hasPermission(profile?.role, 'settings.manage') && profile?.role !== 'admin') {
     return NextResponse.json({ error: 'Forbidden. Admin/Manager access required.' }, { status: 403 })
  }

  // Get users
  const usersResult: any = await withTimeout(
    supabase.from('profiles').select('id, full_name, email, role') as any,
    10000,
    { data: [], error: null } as any
  )

  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message }, { status: 500 })
  }

  return NextResponse.json(usersResult.data)
}
