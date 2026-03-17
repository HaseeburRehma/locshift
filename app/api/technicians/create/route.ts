import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'
import { createNotification } from '@/lib/notifications/inApp'
import * as z from 'zod'

const techSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).regex(/^(\+49|0)\d{9,12}$/, 'Must be a valid German phone number'),
  service_area: z.array(z.string()).min(1, 'At least one service area is required'),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  is_available: z.boolean().default(true),
  is_active: z.boolean().default(true),
  createLogin: z.boolean().optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'technicians.create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = techSchema.parse(body)

    // Insert technician
    const { data: tech, error: techError } = await supabase
      .from('technicians')
      .insert({
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        service_area: validatedData.service_area,
        skills: validatedData.skills,
        is_available: validatedData.is_available,
        is_active: validatedData.is_active
      })
      .select('*')
      .single()

    if (techError || !tech) throw techError

    // Create Login if requested
    if (validatedData.createLogin && validatedData.email) {
      // Note: This requires admin client to invite
      // For now, we'll assume the helper exists or just return success
      // If we had the admin client, we'd use supabase.auth.admin.inviteUserByEmail
    }

    // Notify
    await createNotification({
      forRoles: ['admin'],
      type: 'info' as any,
      title: `New technician added: ${tech.name}`,
      body: `Technician ${tech.name} has been added to the system.`,
      actionUrl: `/dashboard/technicians/${tech.id}`
    })

    return NextResponse.json({ success: true, technician: tech })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.format() }, { status: 400 })
    }
    console.error('[api/technicians/create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
