import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { authCookieOptions, rememberFromCookie } from '@/lib/supabase/remember'

// Fake @supabase/ssr: getUser() can simulate a token refresh by calling the
// middleware's setAll with new session cookies (what Supabase does when the
// access token expired).
const fake = vi.hoisted(() => ({
  user: null as null | { id: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> },
  refresh: false,
  hang: false,
  profileQueries: 0,
  profile: { role: 'admin', onboarding_completed: true, must_change_password: false } as Record<string, unknown>,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: any) => ({
    auth: {
      getUser: async () => {
        if (fake.hang) await new Promise(() => {})
        if (fake.refresh) {
          opts.cookies.setAll([
            { name: 'sb-test-auth-token', value: 'base64-NEW-SESSION', options: { path: '/', sameSite: 'lax', maxAge: 34560000 } },
            { name: 'sb-test-auth-token.1', value: '', options: { path: '/', maxAge: 0 } },
          ])
        }
        return { data: { user: fake.user } }
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => { fake.profileQueries++; return { data: fake.profile } } }) }) }),
  }),
}))

const middleware = (await import('@/middleware')).default

function req(path: string, cookies: Record<string, string> = {}) {
  const r = new NextRequest(`https://app.lokshift.test${path}`)
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v)
  return r
}
const location = (res: Response) => (res.headers.get('location') ? new URL(res.headers.get('location')!).pathname : null)
const setCookie = (res: Response) => res.headers.getSetCookie?.() ?? []

beforeEach(() => {
  fake.user = null
  fake.refresh = false
  fake.hang = false
  fake.profileQueries = 0
  fake.profile = { role: 'admin', onboarding_completed: true, must_change_password: false }
})

describe('signed-in users are sent to the dashboard', () => {
  it.each(['/', '/login', '/register'])('%s → /dashboard', async (path) => {
    fake.user = { id: 'u1' }
    const res = await middleware(req(path))
    expect(res.status).toBe(307)
    expect(location(res)).toBe('/dashboard')
  })
  it.each(['/', '/login', '/register'])('%s stays for visitors', async (path) => {
    const res = await middleware(req(path))
    expect(location(res)).toBeNull()
  })
  it.each(['/forgot-password', '/auth/callback?code=x', '/auth/auth-code-error'])('%s never redirects (auth flows)', async (path) => {
    fake.user = { id: 'u1' }
    const res = await middleware(req(path))
    expect(location(res)).toBeNull()
  })
  it('a password-reset link may land on /change-password before a session exists', async () => {
    const res = await middleware(req('/change-password?code=abc'))
    expect(location(res)).toBeNull()
  })
  it('visitors on /dashboard go to /login', async () => {
    expect(location(await middleware(req('/dashboard/times')))).toBe('/login')
  })
})

describe('refreshed tokens are never lost (the logout bug)', () => {
  // Refresh tokens are single-use: if a redirect drops the new cookies, the
  // browser retries with the spent token and Supabase ends the session.
  const cases: [string, () => void, string][] = [
    ['entry page → dashboard', () => { fake.user = { id: 'u1' } }, '/login'],
    ['forced password change', () => { fake.user = { id: 'u1' }; fake.profile = { role: 'admin', must_change_password: true } }, '/dashboard'],
    ['employee onboarding', () => { fake.user = { id: 'u1' }; fake.profile = { role: 'employee', onboarding_completed: false } }, '/dashboard/times'],
    ['RBAC: employee on admin page', () => { fake.user = { id: 'u1' }; fake.profile = { role: 'employee', onboarding_completed: true } }, '/dashboard/users'],
    ['done onboarding → dashboard', () => { fake.user = { id: 'u1' } }, '/onboarding'],
    ['plain page view', () => { fake.user = { id: 'u1' } }, '/dashboard/times'],
  ]
  it.each(cases)('%s keeps the new session cookie with its 400-day lifetime', async (_n, setup, path) => {
    setup()
    fake.refresh = true
    const res = await middleware(req(path))
    const cookies = setCookie(res)
    const session = cookies.find((c) => c.startsWith('sb-test-auth-token='))
    expect(session, cookies.join(' | ')).toBeTruthy()
    expect(session).toMatch(/Max-Age=34560000/i)
    // Chunk deletions still go out (maxAge 0).
    expect(cookies.find((c) => c.startsWith('sb-test-auth-token.1='))).toMatch(/Max-Age=0/i)
  })

  it('without "Angemeldet bleiben" the refreshed cookie is a browser-session cookie', async () => {
    fake.user = { id: 'u1' }
    fake.refresh = true
    const res = await middleware(req('/login', { lokshift_remember: '0' }))
    const session = setCookie(res).find((c) => c.startsWith('sb-test-auth-token='))!
    expect(session).not.toMatch(/Max-Age=|Expires=/i)
    // …but sign-out deletions are untouched.
    expect(setCookie(res).find((c) => c.startsWith('sb-test-auth-token.1='))).toMatch(/Max-Age=0/i)
  })
})

describe('remember helpers', () => {
  it('missing or "1" means stay signed in; only "0" opts out', () => {
    expect(rememberFromCookie(undefined)).toBe(true)
    expect(rememberFromCookie('1')).toBe(true)
    expect(rememberFromCookie('garbage')).toBe(true)
    expect(rememberFromCookie('0')).toBe(false)
  })
  it('strips lifetime only for set cookies when not remembered', () => {
    const opts = { path: '/', maxAge: 100, expires: new Date(0), sameSite: 'lax' }
    expect(authCookieOptions(opts, true)).toBe(opts)
    expect(authCookieOptions(opts, false)).toEqual({ path: '/', sameSite: 'lax' })
    expect(authCookieOptions({ path: '/', maxAge: 0 }, false)).toEqual({ path: '/', maxAge: 0 })
    expect(authCookieOptions(undefined, false)).toBeUndefined()
  })
})

describe('no database queries in middleware (QA P0-2)', () => {
  const meta = (role: string, extra: Record<string, unknown> = {}) => ({ lokshift: { role, onboarding_completed: true, must_change_password: false, ...extra } })

  it('reads role and flags from app_metadata without a profiles query', async () => {
    fake.user = { id: 'u1', app_metadata: meta('employee') }
    fake.profile = { role: 'admin' } // would allow the page if it were read
    const res = await middleware(req('/dashboard/users'))
    expect(location(res)).toBe('/dashboard')
    expect(fake.profileQueries).toBe(0)
  })
  it('forced password change and onboarding work from app_metadata', async () => {
    fake.user = { id: 'u1', app_metadata: meta('admin', { must_change_password: true }) }
    expect(location(await middleware(req('/dashboard')))).toBe('/change-password')
    fake.user = { id: 'u1', app_metadata: meta('employee', { onboarding_completed: false }) }
    expect(location(await middleware(req('/dashboard/times')))).toBe('/onboarding')
    expect(fake.profileQueries).toBe(0)
  })
  it('falls back to one profiles query before the migration is applied', async () => {
    fake.user = { id: 'u1' }
    await middleware(req('/dashboard/times'))
    expect(fake.profileQueries).toBe(1)
  })
  it('a user-editable user_metadata role is ignored', async () => {
    fake.user = { id: 'u1', user_metadata: { lokshift: { role: 'admin' } }, app_metadata: meta('employee') }
    expect(location(await middleware(req('/dashboard/users')))).toBe('/dashboard')
  })
})

describe('a hanging Supabase never times out the site (QA P0-2)', () => {
  it('answers within the time limit instead of hanging', async () => {
    vi.useFakeTimers()
    try {
      fake.hang = true
      const pending = middleware(req('/dashboard/times', { 'sb-test-auth-token': 'x' }))
      await vi.advanceTimersByTimeAsync(4100)
      const res = await pending
      expect(location(res)).toBeNull() // page loads; RLS protects the data
    } finally {
      vi.useRealTimers()
    }
  })
  it('without a session cookie a protected page still goes to the login', async () => {
    vi.useFakeTimers()
    try {
      fake.hang = true
      const pending = middleware(req('/dashboard/times'))
      await vi.advanceTimersByTimeAsync(4100)
      expect(location(await pending)).toBe('/login')
    } finally {
      vi.useRealTimers()
    }
  })
})
