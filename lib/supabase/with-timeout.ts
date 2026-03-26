/**
 * withTimeout — wraps a promise with a timeout fallback.
 * Use for every server-side Supabase query to prevent 3+ minute hangs
 * when Supabase Cloudflare edge closes idle connections.
 *
 * @param promise  The Supabase query promise (or any promise)
 * @param ms       Timeout in milliseconds (default 8000)
 * @param fallback Value to return on timeout/error
 * @param controller Optional AbortController to signal cancellation
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000,
  fallback: T,
  controller?: AbortController
): Promise<T> {
  let timeoutId: any
  
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`[withTimeout] Query timed out after ${ms}ms`)
      if (controller) {
        console.log('[withTimeout] Signaling AbortController stop')
        controller.abort()
      }
      resolve(fallback)
    }, ms)
  })

  try {
    const result = await Promise.race([promise, timeout])
    return result
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.log('[withTimeout] Fetch aborted successfully')
    } else {
      console.error('[withTimeout] Query failed:', err)
    }
    return fallback
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
