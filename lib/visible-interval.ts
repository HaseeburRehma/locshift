/**
 * setInterval that only runs while the tab is visible.
 *
 * Fallback polls (badges, chat, "on duty now") used to keep querying the
 * database from every open-but-hidden tab, all day. On the free Supabase
 * plan that is wasted compute. A tick that falls into hidden time is
 * skipped; one catch-up run happens as soon as the tab is visible again.
 *
 * Returns a cleanup function.
 */
export function setVisibleInterval(fn: () => unknown, ms: number): () => void {
  if (typeof document === 'undefined') {
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  }
  let missed = false
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') fn()
    else missed = true
  }, ms)
  const onVisible = () => {
    if (document.visibilityState === 'visible' && missed) {
      missed = false
      fn()
    }
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(id)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
