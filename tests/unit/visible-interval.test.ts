import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setVisibleInterval } from '@/lib/visible-interval'

// Minimal document stand-in (unit tests run in the node environment).
function fakeDocument() {
  const listeners = new Set<() => void>()
  const doc = {
    visibilityState: 'visible' as 'visible' | 'hidden',
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    set(state: 'visible' | 'hidden') {
      doc.visibilityState = state
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
  return doc
}

describe('setVisibleInterval', () => {
  let doc: ReturnType<typeof fakeDocument>
  beforeEach(() => {
    vi.useFakeTimers()
    doc = fakeDocument()
    vi.stubGlobal('document', doc)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('polls while the tab is visible', () => {
    const fn = vi.fn()
    setVisibleInterval(fn, 1000)
    vi.advanceTimersByTime(3000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not poll while hidden and catches up once when visible again', () => {
    const fn = vi.fn()
    setVisibleInterval(fn, 1000)
    doc.set('hidden')
    vi.advanceTimersByTime(60_000)
    expect(fn).not.toHaveBeenCalled()
    doc.set('visible')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('no catch-up run when nothing was missed', () => {
    const fn = vi.fn()
    setVisibleInterval(fn, 1000)
    doc.set('hidden')
    doc.set('visible')
    expect(fn).not.toHaveBeenCalled()
  })

  it('cleanup stops the timer and the listener', () => {
    const fn = vi.fn()
    const stop = setVisibleInterval(fn, 1000)
    stop()
    vi.advanceTimersByTime(5000)
    expect(fn).not.toHaveBeenCalled()
    expect(doc.listeners.size).toBe(0)
  })
})
