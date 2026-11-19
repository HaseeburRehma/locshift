/**
 * "Times changed" signal inside the open tab (QA P1-4). Every action that
 * changes time entries or corrections calls notifyTimesChanged(); lists,
 * the sidebar badge and dashboard tiles refetch at once — no reload needed.
 * Realtime still covers changes made in other tabs and devices.
 */
const EVENT = 'lokshift:times-changed'

export function notifyTimesChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

export function onTimesChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
