import { createClient } from '@/lib/supabase/client'

export type NotificationModule = 'plans' | 'customers' | 'calendar' | 'shifts' | 'system' | 'chat'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  module: NotificationModule
  moduleId?: string
  /**
   * Skip the email leg. Useful for low-priority events (e.g. chat pings where
   * the user is already active in the UI). Defaults to false — email is sent.
   */
  skipEmail?: boolean
}

/**
 * Central service for dispatching notifications across the LokShift platform.
 *
 * 1) Persists an in-app row in `notifications` (always)
 * 2) Best-effort email via /api/notifications/email (server-side Resend)
 *
 * Both legs are independent: an email failure does NOT roll back the in-app
 * notification, and vice versa. Failures are logged but do not throw —
 * callers should not rely on email delivery for correctness.
 */
export async function sendNotification({
  userId,
  title,
  message,
  module,
  moduleId,
  skipEmail,
}: CreateNotificationParams) {
  const supabase = createClient()

  try {
    // 1. Persist to Database (In-App Alert).
    // The `notifications` table column is `body`, not `message` — we accept
    // `message` in the params for caller ergonomics but persist as `body`.
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body: message,
        type: module,
        is_read: false
      } as any)

    if (dbError) {
      console.error('[NotificationService] Database persistence error:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      })
      throw dbError
    }

    // 2. Fire-and-forget email via the server route. We do NOT await because
    //    the caller (often a UI action) should not block on SMTP latency.
    if (!skipEmail && typeof window !== 'undefined') {
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subject: title, message }),
      }).catch(err => {
        console.warn('[NotificationService] Email dispatch failed (non-fatal):', err)
      })
    }

    return { success: true }
  } catch (error) {
    console.error('[NotificationService] Failed to dispatch notification:', error)
    return { success: false, error }
  }
}
