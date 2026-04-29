import { createClient } from '@/lib/supabase/client'

export type NotificationModule = 'plans' | 'customers' | 'calendar' | 'shifts' | 'system' | 'chat'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  module: NotificationModule
  moduleId?: string
}

/**
 * Central service for dispatching notifications across the LokShift platform.
 * Integrates database persistence with email alerting foundations.
 */
export async function sendNotification({
  userId,
  title,
  message,
  module,
  moduleId
}: CreateNotificationParams) {
  const supabase = createClient()

  console.log(`[NotificationService] Dispatching alert to ${userId}: ${title}`)

  try {
    // 1. Persist to Database (In-App Alert)
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        module_type: module,
        module_id: moduleId,
        is_read: false
      })

    if (dbError) {
      console.error('[NotificationService] Database persistence error:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      })
      throw dbError
    }

    // 2. Mock Email Dispatch (Foundation for Resend/SendGrid)
    // In production, this would call an API like Resend.
    console.log(`[NotificationService] Sending Email to ${userId}...`)
    console.log(`Subject: ${title}\nBody: ${message}\n---`)

    return { success: true }
  } catch (error) {
    console.error('[NotificationService] Failed to dispatch notification:', error)
    return { success: false, error }
  }
}
