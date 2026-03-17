/**
 * withTimeout — wraps a promise with a timeout fallback.
 * Use for every server-side Supabase query to prevent 3+ minute hangs
 * when Supabase Cloudflare edge closes idle connections.
 *
 * @param promise  The Supabase query promise (or any promise)
 * @param ms       Timeout in milliseconds (default 8000)
 * @param fallback Value to return on timeout/error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000,
  fallback: T
): Promise<T> {
  let timeoutId: any
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`[withTimeout] Query timed out after ${ms}ms`)
      resolve(fallback)
    }, ms)
  })

  try {
    const result = await Promise.race([promise, timeout])
    return result
  } catch (err) {
    console.error('[withTimeout] Query failed:', err)
    return fallback
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
