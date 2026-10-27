/**
 * "Angemeldet bleiben" (stay signed in) for the web app.
 *
 * Supabase keeps the session in cookies that @supabase/ssr always writes
 * with a 400-day lifetime. The login form stores the user's choice in the
 * small cookie below; every place that writes auth cookies (browser client,
 * middleware, server client, auth callback) passes the options through
 * `authCookieOptions`:
 *
 *   stay signed in (default) → persistent cookies, the session survives
 *                              closing the browser and is refreshed silently
 *   unchecked                → browser-session cookies, closing the browser
 *                              signs the user out
 */

export const REMEMBER_COOKIE = 'lokshift_remember'

const REMEMBER_MAX_AGE = 400 * 24 * 60 * 60

export interface CookieOptionsLike {
  maxAge?: number
  expires?: Date | number | string
  [key: string]: unknown
}

/** Missing or anything but "0" means stay signed in — the safe default. */
export function rememberFromCookie(value: string | null | undefined): boolean {
  return value !== '0'
}

/**
 * Options for an auth cookie under the user's choice. Deletions (maxAge 0)
 * are never touched, so signing out always clears the session.
 */
export function authCookieOptions<T extends CookieOptionsLike | undefined>(options: T, remember: boolean): T {
  if (remember || !options || options.maxAge === 0) return options
  const { maxAge: _maxAge, expires: _expires, ...rest } = options as CookieOptionsLike
  return rest as T
}

/** Browser only: store the choice before the session is written. */
export function setRememberChoice(remember: boolean): void {
  if (typeof document === 'undefined') return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${REMEMBER_COOKIE}=${remember ? '1' : '0'}; Path=/; Max-Age=${REMEMBER_MAX_AGE}; SameSite=Lax${secure}`
}

/** Browser only: current choice from document.cookie. */
export function readRememberChoice(): boolean {
  if (typeof document === 'undefined') return true
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${REMEMBER_COOKIE}=`))
  return rememberFromCookie(hit?.slice(REMEMBER_COOKIE.length + 1))
}
