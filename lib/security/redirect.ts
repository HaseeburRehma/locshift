/**
 * Redirect targets that come from the request (query `next`, body
 * `redirectTo`, notification links) must stay inside the app.
 *
 * Accepted: "/dashboard", "/change-password?x=1".
 * Rejected: "//evil.com", "/\evil.com", "@evil.com", "https://evil.com",
 * "javascript:…", control characters — anything a browser could resolve to
 * another origin when appended to ours.
 */
export function safeRelativePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  if (v.length === 0 || v.length > 500) return fallback
  if (!/^\/(?![/\\])/.test(v)) return fallback
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f\\]/.test(v)) return fallback
  try {
    // Must resolve to the same origin when appended to a dummy base.
    const base = 'https://lokshift.invalid'
    if (new URL(v, base).origin !== base) return fallback
  } catch {
    return fallback
  }
  return v
}

/**
 * Public origin for links in emails. Never derived from Origin/Host request
 * headers (attacker-controlled on server-to-server calls).
 */
export function siteOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (configured && /^https?:\/\//.test(configured)) return configured
  return new URL(requestUrl).origin
}
