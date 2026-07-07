/**
 * Thin wrapper around the Resend SDK.
 *
 * Resend was chosen because it's already in package.json and supports
 * React Email templates (which the codebase already has in
 * lib/email-templates/). Keep this server-side only — RESEND_API_KEY must
 * never reach the browser.
 */

import { Resend } from 'resend'

let cached: Resend | null = null

function client(): Resend | null {
  // Lazy init — letting builds succeed even when the key isn't set locally.
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!cached) cached = new Resend(key)
  return cached
}

export interface SendEmailArgs {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

export async function sendEmailViaResend(args: SendEmailArgs): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = client()
  if (!resend) {
    // Don't throw — emails are best-effort. The in-app notification still
    // persists. Caller decides how to surface this.
    console.warn('[Resend] RESEND_API_KEY missing — skipping email send')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  // Sender must be @lokshift.de — that's the verified Resend domain.
  // Override in Vercel env if you need a different verified sender.
  const from = process.env.RESEND_FROM_ADDRESS || 'LokShift <noreply@lokshift.de>'

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html ?? `<p>${escapeHtml(args.text)}</p>`,
    })
    if (error) {
      console.error('[Resend] Send error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, id: data?.id }
  } catch (err: any) {
    console.error('[Resend] Unexpected error:', err)
    return { success: false, error: err?.message ?? 'Unknown email error' }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
