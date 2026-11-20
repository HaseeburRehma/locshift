import { afterEach, describe, expect, it, vi } from 'vitest'
import { personName } from '@/lib/utils'
import { hideInternal, seesInternal, visibleByEmployee, visibleProfiles } from '@/lib/profiles/internal'

describe('personName (QA 20.11. #5 approver attribution)', () => {
  it('prefers the full name', () => {
    expect(personName({ full_name: 'Adem Altay', email: 'a@x.de' })).toBe('Adem Altay')
  })
  it('falls back to the e-mail when the name is empty', () => {
    expect(personName({ full_name: null, email: 'admin@x.de' })).toBe('admin@x.de')
    expect(personName({ full_name: '   ', email: 'admin@x.de' })).toBe('admin@x.de')
  })
  it('is null without a person', () => {
    expect(personName(null)).toBeNull()
    expect(personName({ full_name: null, email: null })).toBeNull()
  })
})

function fakeStorage(value: string | null) {
  vi.stubGlobal('window', { localStorage: { getItem: () => value, setItem: () => {}, removeItem: () => {} } })
}

describe('internal test accounts (QA 20.11. #2)', () => {
  afterEach(() => vi.unstubAllGlobals())
  const rows = [
    { id: 'a', is_internal: false, employee: { is_internal: false } },
    { id: 'b', is_internal: true, employee: { is_internal: true } },
  ]

  it('hides test accounts from client viewers', () => {
    fakeStorage('1')
    expect(seesInternal({ is_internal: false })).toBe(false)
    expect(visibleProfiles(rows, { is_internal: false }).map((r) => r.id)).toEqual(['a'])
  })

  it('hides them from internal staff too unless switched on', () => {
    fakeStorage(null)
    expect(seesInternal({ is_internal: true })).toBe(false)
    expect(visibleByEmployee(rows, { is_internal: true }).map((r) => r.id)).toEqual(['a'])
  })

  it('shows them to internal staff who switched them on', () => {
    fakeStorage('1')
    expect(seesInternal({ is_internal: true })).toBe(true)
    expect(visibleByEmployee(rows, { is_internal: true }).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('adds the SQL filter unless opted in', () => {
    fakeStorage(null)
    const calls: unknown[][] = []
    const q = { eq(...a: unknown[]) { calls.push(a); return q } }
    hideInternal(q, { is_internal: true })
    expect(calls).toEqual([['is_internal', false]])
  })

  it('stays hidden when storage is blocked', () => {
    vi.stubGlobal('window', { localStorage: { getItem: () => { throw new Error('blocked') } } })
    expect(seesInternal({ is_internal: true })).toBe(false)
  })
})
