import { afterEach, describe, expect, it } from 'vitest'
import { safeRelativePath, siteOrigin } from '@/lib/security/redirect'
import { clientIp, createRateLimiter } from '@/lib/security/rate-limit'
import { pickFields, SELF_EDITABLE_PROFILE_FIELDS } from '@/lib/supabase/api-auth'

describe('safeRelativePath', () => {
  it.each(['/dashboard', '/change-password', '/dashboard/times?x=1&y=%2F', '/a#b'])('keeps %s', (p) => {
    expect(safeRelativePath(p, '/fallback')).toBe(p)
  })
  it.each([
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    '@evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    'evil.com',
    '/%0d%0aSet-Cookie:x=1'.replace('%0d%0a', '\r\n'),
    '/\tevil',
    ' //evil.com',
    '',
    '/' + 'a'.repeat(600),
  ])('rejects %j', (p) => {
    expect(safeRelativePath(p, '/fallback')).toBe('/fallback')
  })
  it('rejects non-strings', () => {
    expect(safeRelativePath(null, '/f')).toBe('/f')
    expect(safeRelativePath({ toString: () => '/x' }, '/f')).toBe('/f')
    expect(safeRelativePath(['/x'], '/f')).toBe('/f')
  })
})

describe('siteOrigin', () => {
  const old = process.env.NEXT_PUBLIC_SITE_URL
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = old
  })
  it('prefers the configured site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.lokshift.de/'
    expect(siteOrigin('https://attacker.example/api/x')).toBe('https://app.lokshift.de')
  })
  it('falls back to the request URL, never headers', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(siteOrigin('https://locshift-w5rv.vercel.app/api/x')).toBe('https://locshift-w5rv.vercel.app')
  })
})

describe('createRateLimiter', () => {
  it('blocks after the limit and frees the slot after the window', () => {
    const take = createRateLimiter(3, 1000)
    expect([take('k', 0), take('k', 1), take('k', 2)].every((r) => r.ok)).toBe(true)
    const blocked = take('k', 3)
    expect(blocked.ok).toBe(false)
    expect(blocked.ok === false && blocked.retryAfterSec).toBe(1)
    expect(take('other', 3).ok).toBe(true)
    expect(take('k', 1001).ok).toBe(true)
  })
  it('evicts idle keys so memory stays bounded', () => {
    const take = createRateLimiter(1, 10, 100)
    for (let i = 0; i < 1000; i++) take(`k${i}`, i * 20)
    // No assertion on internals — just must not throw or slow down.
    expect(take('fresh', 100_000).ok).toBe(true)
  })
  it('clientIp takes the first forwarded hop', () => {
    expect(clientIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('1.2.3.4')
    expect(clientIp(new Request('http://x'))).toBe('unknown')
  })
})

describe('pickFields', () => {
  it('drops everything not whitelisted, nested values and prototype tricks', () => {
    const body = JSON.parse(
      '{"full_name":"A","role":"admin","organization_id":"x","target_hours":99,"bio":{"$ne":1},"__proto__":{"role":"admin"},"phone":"1"}',
    )
    const out = pickFields(body, SELF_EDITABLE_PROFILE_FIELDS)
    expect(out).toEqual({ full_name: 'A', phone: '1' })
    expect((out as Record<string, unknown>).role).toBeUndefined()
  })
  it('caps long strings and rejects non-finite numbers', () => {
    expect(pickFields({ bio: 'x'.repeat(5000) }, ['bio']).bio).toHaveLength(2000)
    expect(pickFields({ n: Infinity }, ['n'])).toEqual({})
  })
  it('handles junk bodies', () => {
    expect(pickFields(null, ['a'])).toEqual({})
    expect(pickFields([1, 2], ['0'])).toEqual({})
    expect(pickFields('str', ['a'])).toEqual({})
  })
})
