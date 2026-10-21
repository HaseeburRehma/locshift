//app/api/users/[id]/route.ts
//
// DELETE: admin removes a user of the SAME organisation.
// PATCH:  self-update of non-sensitive profile fields, or an admin of the
//         same organisation updating a member. Role, organisation, e-mail,
//         activation and the forced-password flag can't be set here.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller, organizationOf, PROTECTED_PROFILE_FIELDS } from '@/lib/supabase/api-auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const caller = await getApiCaller()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (caller.role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    if (id === caller.id) return NextResponse.json({ error: 'You cannot delete your own account here' }, { status: 400 })
    if (!caller.organizationId || (await organizationOf(id)) !== caller.organizationId) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    // Delete from Auth (cascade handles profiles)
    const { error: deleteError } = await createAdminClient().auth.admin.deleteUser(id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[User DELETE] Error:', err)
    return NextResponse.json({ error: 'Could not delete user' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const caller = await getApiCaller()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSelf = caller.id === id
    if (!isSelf) {
      if (caller.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      if (!caller.organizationId || (await organizationOf(id)) !== caller.organizationId) {
        return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
      }
    }

    const body = (await request.json()) as Record<string, unknown>
    const updates = Object.fromEntries(
      Object.entries(body ?? {}).filter(([k]) => !(PROTECTED_PROFILE_FIELDS as readonly string[]).includes(k)),
    )
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
    }

    const { error } = await createAdminClient()
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[User PATCH] Error:', err)
    return NextResponse.json({ error: 'Could not update user' }, { status: 500 })
  }
}
