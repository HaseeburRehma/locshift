import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN, EMP, EMP2, EMP3, OUTSIDER, ORG_A, jsonRequest, op } from './fake-supabase'
import { mocks, resetWorld, signIn, state, updatesOn } from './world'

vi.mock('@/lib/supabase/server', () => mocks.server())
vi.mock('@/lib/supabase/admin', () => mocks.admin())
vi.mock('@supabase/supabase-js', () => mocks.supabaseJs())

const users = await import('@/app/api/users/route')
const create = await import('@/app/api/users/create/route')
const role = await import('@/app/api/users/role/route')
const byId = await import('@/app/api/users/[id]/route')
const status = await import('@/app/api/users/[id]/status/route')
const reset = await import('@/app/api/users/[id]/reset-password/route')
const profile = await import('@/app/api/profile/route')

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patch = (url: string, body: unknown) => jsonRequest(url, body, { method: 'PATCH' })

beforeEach(() => resetWorld())

describe('every user route rejects anonymous callers', () => {
  it.each([
    ['GET /api/users', () => users.GET()],
    ['POST /api/users/create', () => create.POST(jsonRequest('http://l/api/users/create', {}))],
    ['PATCH /api/users/role', () => role.PATCH(patch('http://l/api/users/role', {}))],
    ['PATCH /api/users/:id', () => byId.PATCH(patch('http://l', {}), params(EMP))],
    ['DELETE /api/users/:id', () => byId.DELETE(new Request('http://l', { method: 'DELETE' }), params(EMP))],
    ['PATCH /api/users/:id/status', () => status.PATCH(patch('http://l', { is_active: false }), params(EMP))],
    ['POST /api/users/:id/reset-password', () => reset.POST(jsonRequest('http://l', {}), params(EMP))],
    ['PATCH /api/profile', () => profile.PATCH(patch('http://l', { full_name: 'x' }))],
  ])('%s → 401', async (_n, call) => {
    expect((await call()).status).toBe(401)
  })
})

describe('employees cannot use admin endpoints', () => {
  beforeEach(() => signIn(EMP))
  it.each([
    ['list users', () => users.GET()],
    ['create user', () => create.POST(jsonRequest('http://l', { email: 'x@y.de', password: 'longenough', role: 'admin' }))],
    ['change role', () => role.PATCH(patch('http://l', { userId: EMP2, role: 'admin' }))],
    ['edit colleague', () => byId.PATCH(patch('http://l', { full_name: 'pwned' }), params(EMP2))],
    ['delete colleague', () => byId.DELETE(new Request('http://l', { method: 'DELETE' }), params(EMP2))],
    ['deactivate colleague', () => status.PATCH(patch('http://l', { is_active: false }), params(EMP2))],
    ['reset colleague password', () => reset.POST(jsonRequest('http://l', {}), params(EMP2))],
  ])('%s → 403', async (_n, call) => {
    expect((await call()).status).toBe(403)
    expect(state.admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(state.admin.auth.admin.deleteUser).not.toHaveBeenCalled()
  })
  it('dispatchers cannot list or change roles either', async () => {
    signIn(EMP3)
    expect((await users.GET()).status).toBe(403)
    expect((await role.PATCH(patch('http://l', { userId: EMP, role: 'dispatcher' }))).status).toBe(403)
  })
})

describe('deactivated accounts are locked out even with a valid token', () => {
  it('inactive admin → 401 everywhere', async () => {
    state.people.find((p) => p.id === ADMIN)!.is_active = false
    signIn(ADMIN)
    expect((await users.GET()).status).toBe(401)
    expect((await status.PATCH(patch('http://l', { is_active: true }), params(EMP))).status).toBe(401)
    expect((await reset.POST(jsonRequest('http://l', {}), params(EMP))).status).toBe(401)
  })
})

describe('cross-organisation access (IDOR)', () => {
  beforeEach(() => signIn(ADMIN))
  it.each([
    ['edit', () => byId.PATCH(patch('http://l', { full_name: 'x' }), params(OUTSIDER))],
    ['delete', () => byId.DELETE(new Request('http://l', { method: 'DELETE' }), params(OUTSIDER))],
    ['deactivate', () => status.PATCH(patch('http://l', { is_active: false }), params(OUTSIDER))],
    ['reset password', () => reset.POST(jsonRequest('http://l', {}), params(OUTSIDER))],
    ['change role', () => role.PATCH(patch('http://l', { userId: OUTSIDER, role: 'employee' }))],
    ['unknown id', () => status.PATCH(patch('http://l', { is_active: false }), params('00000000-0000-4000-8000-000000000000'))],
  ])('%s a user of another org → 404, nothing written', async (_n, call) => {
    expect((await call()).status).toBe(404)
    expect(updatesOn(state.admin, 'profiles')).toHaveLength(0)
    expect(state.admin.auth.admin.deleteUser).not.toHaveBeenCalled()
    expect(state.admin.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
  it('user list is scoped to the caller org', async () => {
    const res = await users.GET()
    const list = (await res.json()) as { id: string }[]
    expect(list.map((u) => u.id)).not.toContain(OUTSIDER)
    expect(list.length).toBe(4)
  })
})

describe('self-service profile updates cannot escalate', () => {
  it('PATCH /api/users/:id (self) keeps only personal fields', async () => {
    signIn(EMP)
    const res = await byId.PATCH(
      patch('http://l', { full_name: 'Neu', role: 'admin', organization_id: 'x', target_hours: 1, is_active: true, must_change_password: false }),
      params(EMP),
    )
    expect(res.status).toBe(200)
    const [q] = updatesOn(state.admin, 'profiles')
    const written = op(q, 'update')![1] as Record<string, unknown>
    expect(Object.keys(written).sort()).toEqual(['full_name', 'updated_at'])
  })
  it('PATCH /api/users/:id (self) with only HR fields → 400', async () => {
    signIn(EMP)
    const res = await byId.PATCH(patch('http://l', { target_hours: 10, working_time_model_id: 'x' }), params(EMP))
    expect(res.status).toBe(400)
  })
  it('PATCH /api/profile ignores role / org / HR fields', async () => {
    signIn(EMP)
    const res = await profile.PATCH(patch('http://l', { role: 'admin', organization_id: 'x', hourly_rate: 999 }))
    expect(res.status).toBe(400)
    expect(updatesOn(state.server, 'profiles')).toHaveLength(0)
  })
  it('PATCH /api/profile rejects malformed JSON', async () => {
    signIn(EMP)
    expect((await profile.PATCH(patch('http://l', '{not json'))).status).toBe(400)
  })
  it('admin may set HR fields on a member but never role/org/active via this route', async () => {
    signIn(ADMIN)
    const res = await byId.PATCH(
      patch('http://l', { target_hours: 38.5, role: 'admin', organization_id: 'x', is_active: false, 'bad key; drop table': 1 }),
      params(EMP),
    )
    expect(res.status).toBe(200)
    const written = op(updatesOn(state.admin, 'profiles')[0], 'update')![1] as Record<string, unknown>
    expect(Object.keys(written).sort()).toEqual(['target_hours', 'updated_at'])
  })
})

describe('POST /api/users/create', () => {
  beforeEach(() => signIn(ADMIN))
  const body = { email: 'neu@a.test', password: 'Sicher123!', fullName: 'Neu', role: 'employee' }

  it('rejects FixDone-era and made-up roles', async () => {
    for (const r of ['viewer', 'manager', 'technician', 'superadmin', '']) {
      const res = await create.POST(jsonRequest('http://l', { ...body, role: r }))
      expect(res.status).toBe(400)
    }
    expect(state.admin.auth.admin.createUser).not.toHaveBeenCalled()
  })
  it('validates email and password length', async () => {
    expect((await create.POST(jsonRequest('http://l', { ...body, email: 'nope' }))).status).toBe(400)
    expect((await create.POST(jsonRequest('http://l', { ...body, password: 'short' }))).status).toBe(400)
    expect((await create.POST(jsonRequest('http://l', { ...body, password: 'x'.repeat(100) }))).status).toBe(400)
  })
  it("puts the new user into the admin's organisation with a forced password change", async () => {
    state.admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: { id: 'new-id', email: body.email } }, error: null })
    const res = await create.POST(jsonRequest('http://l', { ...body, organization_id: 'attacker-org' }))
    expect(res.status).toBe(200)
    const row = op(updatesOn(state.admin, 'profiles')[0], 'upsert')![1] as Record<string, unknown>
    expect(row).toMatchObject({ id: 'new-id', organization_id: ORG_A, role: 'employee', must_change_password: true })
  })
  it('rolls the auth user back when the profile cannot be set up', async () => {
    state.admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: { id: 'new-id', email: body.email } }, error: null })
    state.extra = (q) => (q.table === 'profiles' && op(q, 'upsert') ? { error: { message: 'boom' } } : undefined)
    const res = await create.POST(jsonRequest('http://l', body))
    expect(res.status).toBe(500)
    expect(state.admin.auth.admin.deleteUser).toHaveBeenCalledWith('new-id')
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })
  it('duplicate email → 409 without leaking internals', async () => {
    state.admin.auth.admin.createUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'A user with this email address has already been registered' } })
    const res = await create.POST(jsonRequest('http://l', body))
    expect(res.status).toBe(409)
  })
})

describe('role + status guards', () => {
  beforeEach(() => signIn(ADMIN))
  it('cannot change own role or deactivate self', async () => {
    expect((await role.PATCH(patch('http://l', { userId: ADMIN, role: 'employee' }))).status).toBe(400)
    expect((await status.PATCH(patch('http://l', { is_active: false }), params(ADMIN))).status).toBe(400)
  })
  it('role must be a LokShift role', async () => {
    expect((await role.PATCH(patch('http://l', { userId: EMP, role: 'manager' }))).status).toBe(400)
    expect((await role.PATCH(patch('http://l', { userId: EMP, role: 'dispatcher' }))).status).toBe(200)
  })
  it('is_active must be a real boolean', async () => {
    for (const v of ['false', 0, null, 'true']) {
      expect((await status.PATCH(patch('http://l', { is_active: v }), params(EMP))).status).toBe(400)
    }
  })
  it('admin cannot delete themself', async () => {
    expect((await byId.DELETE(new Request('http://l', { method: 'DELETE' }), params(ADMIN))).status).toBe(400)
  })
})

describe('reset-password link target', () => {
  it('ignores a spoofed Origin header', async () => {
    signIn(ADMIN)
    delete process.env.NEXT_PUBLIC_SITE_URL
    await reset.POST(jsonRequest('https://app.lokshift.test/api/users/x/reset-password', {}, { headers: { origin: 'https://evil.example' } }), params(EMP))
    const opts = state.admin.auth.resetPasswordForEmail.mock.calls[0][1] as { redirectTo: string }
    expect(opts.redirectTo).toBe('https://app.lokshift.test/change-password')
  })
})
