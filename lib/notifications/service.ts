/**
 * Client-side entry point for notifications. Every call goes through
 * /api/notifications/dispatch, which writes the in-app row and sends
 * email + push server-side (Resend / Expo keys never reach the browser).
 */

export type NotificationModule =
  | 'plans'
  | 'customers'
  | 'calendar'
  | 'shifts'
  | 'time_entries'
  | 'corrections'
  | 'personnel'
  | 'bonuses'
  | 'per_diem'
  | 'system'
  | 'chat'

export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  module: NotificationModule
  moduleId?: string
  link?: string
  /** Skip the email leg (e.g. chat pings). */
  skipEmail?: boolean
  /** Skip the push leg. */
  skipPush?: boolean
}

interface DispatchBody {
  recipients: string[] | 'managers'
  title: string
  message: string
  module: NotificationModule
  moduleId?: string
  link?: string
  email?: boolean
  push?: boolean
}

async function post(body: DispatchBody): Promise<{ success: boolean; error?: unknown }> {
  try {
    const res = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[NotificationService] dispatch failed', res.status, err)
      return { success: false, error: err }
    }
    return { success: true }
  } catch (error) {
    console.error('[NotificationService] dispatch error', error)
    return { success: false, error }
  }
}

export async function sendNotification(p: CreateNotificationParams) {
  return post({
    recipients: [p.userId],
    title: p.title,
    message: p.message,
    module: p.module,
    moduleId: p.moduleId,
    link: p.link,
    email: !p.skipEmail,
    push: !p.skipPush,
  })
}

export async function sendNotificationToMany(
  userIds: string[],
  p: Omit<CreateNotificationParams, 'userId'>,
) {
  if (userIds.length === 0) return { success: true }
  return post({
    recipients: userIds,
    title: p.title,
    message: p.message,
    module: p.module,
    moduleId: p.moduleId,
    link: p.link,
    email: !p.skipEmail,
    push: !p.skipPush,
  })
}

/** All admins + dispatchers of the caller's organisation (caller excluded). */
export async function notifyManagers(p: Omit<CreateNotificationParams, 'userId'>) {
  return post({
    recipients: 'managers',
    title: p.title,
    message: p.message,
    module: p.module,
    moduleId: p.moduleId,
    link: p.link,
    email: !p.skipEmail,
    push: !p.skipPush,
  })
}
