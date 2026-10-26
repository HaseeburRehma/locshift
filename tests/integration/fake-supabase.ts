/**
 * Minimal stand-in for a supabase-js client. Every query is recorded as
 * { table, ops: [[method, ...args]] }; the result of an awaited query (or of
 * .single()/.maybeSingle()) comes from `resolve(query)`.
 */
import { vi } from 'vitest'

export interface RecordedQuery {
  table: string
  ops: [string, ...unknown[]][]
}

export type Resolver = (q: RecordedQuery) => { data?: unknown; error?: unknown; count?: number } | undefined

export function op(q: RecordedQuery, name: string) {
  return q.ops.find(([m]) => m === name)
}

export function fakeSupabase(resolve: Resolver = () => undefined) {
  const queries: RecordedQuery[] = []

  const builder = (table: string) => {
    const q: RecordedQuery = { table, ops: [] }
    queries.push(q)
    const finish = () => {
      const r = resolve(q) ?? {}
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null, count: r.count })
    }
    const proxy: any = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') return (ok: any, fail: any) => finish().then(ok, fail)
          return (...args: unknown[]) => {
            q.ops.push([prop, ...args])
            if (prop === 'single' || prop === 'maybeSingle') return finish()
            return proxy
          }
        },
      },
    )
    return proxy
  }

  const auth = {
    getUser: vi.fn(async (_token?: string) => ({ data: { user: null as any }, error: null })),
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    exchangeCodeForSession: vi.fn(async (_code: string) => ({ error: null as any })),
    resetPasswordForEmail: vi.fn(async (_email: string, _opts?: unknown) => ({ error: null as any })),
    admin: {
      createUser: vi.fn(async (_a: unknown) => ({ data: { user: null as any }, error: null as any })),
      deleteUser: vi.fn(async (_id: string) => ({ error: null })),
      updateUserById: vi.fn(async (_id: string, _a: unknown) => ({ error: null })),
      generateLink: vi.fn(async (_a: unknown) => ({
        data: { properties: { action_link: 'https://x/verify', email_otp: '123456' } },
        error: null as any,
      })),
    },
  }

  return { from: vi.fn(builder), rpc: vi.fn(), auth, queries }
}

export type FakeSupabase = ReturnType<typeof fakeSupabase>

export function jsonRequest(url: string, body: unknown, init: RequestInit = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string>) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })
}

export const ORG_A = '11111111-1111-4111-8111-111111111111'
export const ORG_B = '22222222-2222-4222-8222-222222222222'
export const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
export const EMP = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
export const EMP2 = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
export const EMP3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
export const OUTSIDER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
