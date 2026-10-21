'use client'

import { useEffect, useRef, useState } from 'react'

export interface Coalescer {
  /** Debounced trigger: bursts within `delayMs` collapse into one run. */
  schedule: () => void
  /** Cancel a pending run and ignore follow-ups (unmount). */
  dispose: () => void
  /** Re-arm after dispose (React StrictMode re-mount). */
  revive: () => void
}

/**
 * Realtime back-pressure. A bulk change (50 plans inserted, an import of
 * 300 Betriebsstellen …) fires one postgres_changes event per row; calling
 * the refetch for each of them floods PostgREST. The coalescer
 *   - debounces bursts (default 400 ms) into a single run, and
 *   - never runs `fn` concurrently: a trigger arriving while a run is in
 *     flight queues exactly one follow-up run after it finishes.
 */
export function createCoalescer(fn: () => unknown, delayMs = 400): Coalescer {
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let again = false
  let disposed = false

  const run = async (): Promise<void> => {
    if (disposed) return
    if (inFlight) {
      again = true
      return
    }
    inFlight = true
    try {
      await fn()
    } catch (err) {
      console.warn('[coalescer] refetch failed:', err)
    } finally {
      inFlight = false
      if (again && !disposed) {
        again = false
        void run()
      }
    }
  }

  return {
    schedule: () => {
      if (disposed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void run()
      }, delayMs)
    },
    dispose: () => {
      disposed = true
      again = false
      if (timer) clearTimeout(timer)
      timer = null
    },
    revive: () => {
      disposed = false
    },
  }
}

/**
 * React wrapper around createCoalescer(). Returns a stable `schedule`
 * function that always calls the latest `fn`.
 */
export function useCoalescedRefetch(fn: () => unknown, delayMs = 400): () => void {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  }, [fn])
  const [coalescer] = useState(() => createCoalescer(() => fnRef.current(), delayMs))
  useEffect(() => {
    coalescer.revive()
    return () => coalescer.dispose()
  }, [coalescer])
  return coalescer.schedule
}
