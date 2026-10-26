/**
 * A tiny in-memory "database" of profiles across two organisations, wired
 * into the fake Supabase clients the routes receive.
 */
import { vi } from 'vitest'
import { fakeSupabase, op, type FakeSupabase, type RecordedQuery, ADMIN, EMP, EMP2, EMP3, OUTSIDER, ORG_A, ORG_B } from './fake-supabase'

export interface Person {
  id: string
  role: string
  organization_id: string | null
  is_active: boolean
  email: string
}

export const PEOPLE: Person[] = [
  { id: ADMIN, role: 'admin', organization_id: ORG_A, is_active: true, email: 'admin@a.test' },
  { id: EMP, role: 'employee', organization_id: ORG_A, is_active: true, email: 'emp@a.test' },
  { id: EMP2, role: 'employee', organization_id: ORG_A, is_active: true, email: 'emp2@a.test' },
  { id: EMP3, role: 'dispatcher', organization_id: ORG_A, is_active: true, email: 'disp@a.test' },
  { id: OUTSIDER, role: 'admin', organization_id: ORG_B, is_active: true, email: 'admin@b.test' },
]

export const state: {
  server: FakeSupabase
  admin: FakeSupabase
  signedIn: string | null
  people: Person[]
  extra: (q: RecordedQuery) => ReturnType<Parameters<typeof fakeSupabase>[0]>
} = {} as never

function eqValue(q: RecordedQuery, col: string) {
  return q.ops.find(([m, c]) => m === 'eq' && c === col)?.[2]
}

function profilesResolver(q: RecordedQuery) {
  const extra = state.extra?.(q)
  if (extra) return extra
  if (q.table !== 'profiles') return undefined
  if (op(q, 'update') || op(q, 'upsert') || op(q, 'insert')) return { data: null }
  const inIds = op(q, 'in')?.[2] as string[] | undefined
  const id = eqValue(q, 'id') as string | undefined
  const org = eqValue(q, 'organization_id') as string | undefined
  let rows = state.people
  if (inIds) rows = rows.filter((p) => inIds.includes(p.id))
  if (id) rows = rows.filter((p) => p.id === id)
  if (org) rows = rows.filter((p) => p.organization_id === org)
  const single = op(q, 'single') || op(q, 'maybeSingle')
  return { data: single ? rows[0] ?? null : rows }
}

export function resetWorld() {
  state.people = PEOPLE.map((p) => ({ ...p }))
  state.signedIn = null
  state.extra = () => undefined
  state.server = fakeSupabase(profilesResolver)
  state.admin = fakeSupabase(profilesResolver)
  const getUser = async (token?: string) => {
    const id = token ? (state.people.find((p) => token === `token-${p.id}`)?.id ?? null) : state.signedIn
    const p = state.people.find((x) => x.id === id)
    return { data: { user: p ? { id: p.id, email: p.email, user_metadata: {} } : null }, error: null }
  }
  state.server.auth.getUser.mockImplementation(getUser as never)
  state.admin.auth.getUser.mockImplementation(getUser as never)
}

export function signIn(id: string | null) {
  state.signedIn = id
}

/** vi.mock factories — call at the top of each test file. */
export const mocks = {
  server: () => ({ createClient: vi.fn(async () => state.server) }),
  admin: () => ({ createAdminClient: vi.fn(() => state.admin) }),
  supabaseJs: () => ({ createClient: vi.fn(() => state.admin) }),
}

export function updatesOn(client: FakeSupabase, table: string) {
  return client.queries.filter((q) => q.table === table && (op(q, 'update') || op(q, 'upsert') || op(q, 'insert')))
}
