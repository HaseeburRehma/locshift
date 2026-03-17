import { createClient } from '@supabase/supabase-js'
import { NotificationType, UserRole } from '@/lib/types/database.types'

// Use service role key to bypass RLS for server-side notification creation
export async function createNotification(params: {
  userId?: string
  forRoles?: UserRole[]
  title: string
  body?: string
  type: NotificationType
  entityType?: 'lead' | 'job' | 'review' | 'partner_lead'
  entityId?: string
  actionUrl?: string
}): Promise<void> {
  // Initialize inside the function to avoid build-time errors when env vars are missing
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let targetUserIds: string[] = []

    if (params.userId) {
      targetUserIds = [params.userId]
    } else if (params.forRoles?.length) {
      const { data: users } = await adminClient
        .from('profiles')
        .select('id')
        .in('role', params.forRoles)
        .eq('is_active', true)
      
      if (users) {
        targetUserIds = users.map(u => u.id)
      }
    }

    if (targetUserIds.length === 0) return

    const notifications = targetUserIds.map(uid => ({
      user_id: uid,
      title: params.title,
      body: params.body,
      type: params.type,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action_url: params.actionUrl,
      is_read: false
    }))

    const { error } = await adminClient
      .from('notifications')
      .insert(notifications)

    if (error) throw error

  } catch (error) {
    console.error('[createNotification] Error:', error)
  }
}
