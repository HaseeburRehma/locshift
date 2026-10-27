import { createBrowserClient } from '@supabase/ssr'
import { authCookieOptions, readRememberChoice, setRememberChoice } from './remember'

// Tells the database this is a current client (see time_entries_normalize:
// requests without it are treated as the previous app version).
export const LOKSHIFT_CLIENT_HEADERS = { 'x-lokshift-client': '2' }

/*
 * Bug fix: Supabase client should be a singleton in the browser.
 * Creating multiple clients causes "auth lock" contention (lock:sb-...)
 * which leads to the login form hanging and session sync errors.
 *
 * Bug fix #2 (Apr 29, 2026):
 *   "Runtime AbortError: Lock broken by another request with the 'steal' option."
 *
 *   Supabase auth uses navigator.locks to coordinate session refreshes
 *   across tabs. When two tabs race, the second tab calls
 *   navigator.locks.request(name, { steal: true }, ...) which forcibly
 *   aborts the first tab's pending lock — and that AbortError surfaces
 *   as an uncaught Runtime error in the console.
 *
 *   We replace the default lock with a wrapper that:
 *     1. Calls the underlying lock implementation if available
 *     2. Catches AbortError and re-runs the function once (the lock has
 *        been released so there's nothing to wait for)
 *     3. Lets every other error propagate normally
 *
 *   Net effect: the SDK still serializes refresh attempts when it can,
 *   but a stolen lock no longer crashes user code.
 */

async function safeAuthLock<R>(
  lockName: string,
  acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  // Use navigator.locks if available — gives proper cross-tab coordination
  // most of the time; only the AbortError edge case needs the fallback.
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    // Build an AbortSignal-with-timeout in a way that's safe on older
    // browsers that don't have AbortSignal.timeout() yet.
    let signal: AbortSignal | undefined
    if (acquireTimeout > 0) {
      if (typeof (AbortSignal as any).timeout === 'function') {
        signal = (AbortSignal as any).timeout(acquireTimeout) as AbortSignal
      } else {
        const ctrl = new AbortController()
        setTimeout(() => ctrl.abort(), acquireTimeout)
        signal = ctrl.signal
      }
    }

    try {
      const result = await navigator.locks.request(
        lockName,
        signal ? { mode: 'exclusive', signal } : { mode: 'exclusive' },
        async () => fn(),
      )
      return result as R
    } catch (err: any) {
      // Two known-benign cases:
      //   - AbortError: another tab stole this lock → re-run; the lock
      //     has been released so we can proceed unguarded.
      //   - TimeoutError: we waited longer than acquireTimeout → run anyway.
      const errName = err?.name
      if (errName === 'AbortError' || errName === 'TimeoutError') {
        return fn()
      }
      throw err
    }
  }
  // No navigator.locks support (older browsers, SSR) → just run.
  return fn()
}

// "Angemeldet bleiben": @supabase/ssr keeps the session in cookies and
// ignores a custom `storage`, so the browser client writes the auth cookies
// itself and applies the user's choice (see ./remember).
export function setLoginRemember(remember: boolean) {
  setRememberChoice(remember)
}

function readBrowserCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined' || !document.cookie) return []
  return document.cookie.split('; ').map((pair) => {
    const i = pair.indexOf('=')
    const name = i < 0 ? pair : pair.slice(0, i)
    const raw = i < 0 ? '' : pair.slice(i + 1)
    let value = raw
    try { value = decodeURIComponent(raw) } catch { /* keep raw */ }
    return { name, value }
  })
}

function writeBrowserCookie(name: string, value: string, options: Record<string, any> = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`]
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  const sameSite = options.sameSite === true ? 'Strict' : options.sameSite
  if (sameSite) parts.push(`SameSite=${String(sameSite).replace(/^./, (c) => c.toUpperCase())}`)
  if (options.secure || (typeof location !== 'undefined' && location.protocol === 'https:')) parts.push('Secure')
  document.cookie = parts.join('; ')
}

const browserCookies = {
  getAll: () => readBrowserCookies(),
  setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, any> }[]) => {
    // Read at write time: the login form sets the choice right before signIn.
    const remember = readRememberChoice()
    cookiesToSet.forEach(({ name, value, options }) =>
      writeBrowserCookie(name, value, authCookieOptions(options, remember)),
    )
  },
}

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (typeof window === 'undefined') {
    // On server, always create a new client
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: LOKSHIFT_CLIENT_HEADERS } },
    )
  }

  // On client, reuse the singleton
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: LOKSHIFT_CLIENT_HEADERS },
        auth: {
          // Replace the default navigator.locks-based auth lock with our
          // wrapper that catches AbortError noise from cross-tab races.
          lock: safeAuthLock as any,
        },
        cookies: browserCookies,
      },
    )
  }

  return client
}
