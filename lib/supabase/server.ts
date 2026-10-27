import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { authCookieOptions, REMEMBER_COOKIE, rememberFromCookie } from './remember'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Tells the database this is a current client (see time_entries_normalize:
        // requests without it are treated as the previous app version).
        headers: { 'x-lokshift-client': '2' },
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // @ts-ignore - Next.js fetch options
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(10000), // 10s global fetch timeout
          })
        }
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            const remember = rememberFromCookie(cookieStore.get(REMEMBER_COOKIE)?.value)
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, authCookieOptions(options, remember)),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
