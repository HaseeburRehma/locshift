import { createBrowserClient } from '@supabase/ssr'

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

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (typeof window === 'undefined') {
    // On server, always create a new client
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  // On client, reuse the singleton
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Replace the default navigator.locks-based auth lock with our
          // wrapper that catches AbortError noise from cross-tab races.
          lock: safeAuthLock as any,
        },
      },
    )
  }

  return client
}
