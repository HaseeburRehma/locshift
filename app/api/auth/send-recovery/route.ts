/**
 * POST /api/auth/send-recovery
 *
 * Custom password-recovery email that ships BOTH a magic link AND a typeable
 * 6-digit OTP. Supabase's default recovery template only includes one or the
 * other depending on how the project is configured, which is brittle. Calling
 * admin.generateLink({ type: 'recovery' }) on the server returns both pieces:
 *
 *   - properties.action_link  — the one-click magic link
 *   - properties.email_otp    — the 6-digit code the user can type instead
 *
 * We render both into a single email and dispatch via Resend.
 *
 * Anti-enumeration: the response shape is identical whether the email
 * corresponds to a real user or not, so a malicious actor can't probe the
 * user table by guessing emails.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmailViaResend } from '@/lib/email/resend'

interface Body {
  email?: string
  /** Optional override of the link target. Defaults to /change-password. */
  redirectTo?: string
  /** UI locale for the email body (defaults to German). */
  locale?: 'de' | 'en'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const email = body?.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!serviceKey) {
      console.error('[send-recovery] SUPABASE_SERVICE_ROLE_KEY missing')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const admin = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get('origin') ??
      `https://${request.headers.get('host') ?? ''}`
    const redirectTo = `${origin}${body.redirectTo ?? '/change-password'}`

    // generateLink returns BOTH the action_link and the 6-digit email_otp.
    // It does NOT trigger Supabase's default email — we control delivery
    // entirely via Resend below.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    // Anti-enumeration: we treat "user not found" the same as success. Any
    // other failure mode is a real server error worth surfacing.
    if (error) {
      const isUserMissing =
        /not found|not_found|invalid/i.test(error.message ?? '') ||
        (error as any)?.status === 404
      if (isUserMissing) {
        return NextResponse.json({ success: true })
      }
      console.error('[send-recovery] generateLink failed:', error)
      return NextResponse.json({ error: 'Failed to generate recovery link' }, { status: 500 })
    }

    const link = data.properties.action_link
    const otp = data.properties.email_otp
    const locale = body.locale === 'en' ? 'en' : 'de'

    const { subject, text, html } = buildEmail({ link, otp, locale })

    // Fire-and-forget delivery — generateLink already succeeded, so we tell
    // the caller "success" regardless. If Resend rejects (e.g. domain not
    // verified) we log it for ops but don't leak the failure to the client
    // (would help enumeration: real users see error, fake ones see success).
    const result = await sendEmailViaResend({ to: email, subject, text, html })
    if (!result.success) {
      console.warn('[send-recovery] Resend failed (returning success anyway):', result.error)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[send-recovery] Unexpected:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

function buildEmail({ link, otp, locale }: { link: string; otp: string; locale: 'de' | 'en' }) {
  const de = {
    subject: 'Lokshift — Passwort zurücksetzen',
    headline: 'Passwort zurücksetzen',
    intro: 'Sie haben das Zurücksetzen Ihres Passworts angefordert. Sie haben zwei Möglichkeiten, fortzufahren:',
    optionA: 'Option A — Link anklicken',
    optionAcopy: 'Klicken Sie auf den untenstehenden Button, um direkt zur Passwortänderung zu gelangen:',
    cta: 'Passwort jetzt ändern',
    optionB: 'Option B — Code eingeben',
    optionBcopy: 'Oder geben Sie diesen 6-stelligen Code auf der Bestätigungsseite ein:',
    expires: 'Der Link und der Code sind 1 Stunde gültig.',
    notyou: 'Sie haben diese Anfrage nicht gestellt? Sie können diese E-Mail einfach ignorieren — Ihr Konto bleibt unverändert.',
    fallback: 'Funktioniert der Button nicht? Kopieren Sie diesen Link in Ihren Browser:',
  }
  const en = {
    subject: 'Lokshift — Reset your password',
    headline: 'Reset your password',
    intro: 'You requested a password reset. You can finish in one of two ways:',
    optionA: 'Option A — Click the link',
    optionAcopy: 'Click the button below to go straight to the password change page:',
    cta: 'Reset password now',
    optionB: 'Option B — Type the code',
    optionBcopy: 'Or enter this 6-digit code on the verification screen:',
    expires: 'The link and code are valid for 1 hour.',
    notyou: "Didn't request this? Just ignore this email — your account stays unchanged.",
    fallback: "Button not working? Copy this link into your browser:",
  }
  const L = locale === 'en' ? en : de

  const text = [
    L.intro,
    '',
    `${L.optionA}: ${link}`,
    '',
    `${L.optionB}: ${otp}`,
    '',
    L.expires,
    '',
    L.notyou,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eef2f7;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;color:#0064E0;">${L.headline}</h1>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:#475569;">${L.intro}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 16px 32px;">
                <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">${L.optionA}</p>
                <p style="margin:0 0 16px 0;font-size:14px;color:#475569;">${L.optionAcopy}</p>
                <a href="${link}" style="display:inline-block;background:#0064E0;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;">${L.cta}</a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;">${L.optionB}</p>
                <p style="margin:0 0 16px 0;font-size:14px;color:#475569;">${L.optionBcopy}</p>
                <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;">
                  <span style="display:inline-block;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;color:#0f172a;letter-spacing:.5em;padding-left:.5em;">${escapeHtml(otp)}</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">${L.expires}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 32px 32px;border-top:1px solid #eef2f7;margin-top:24px;">
                <p style="margin:24px 0 8px 0;font-size:12px;color:#94a3b8;">${L.fallback}</p>
                <p style="margin:0;font-size:11px;color:#64748b;word-break:break-all;">
                  <a href="${link}" style="color:#0064E0;text-decoration:none;">${escapeHtml(link)}</a>
                </p>
                <p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;">${L.notyou}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject: L.subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
