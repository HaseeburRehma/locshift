import { createBrowserClient } from '@supabase/ssr'

// Bug fix: Supabase client should be a singleton in the browser.
// Creating multiple clients causes "auth lock" contention (lock:sb-...) 
// which leads to the login form hanging and session sync errors.
let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (typeof window === 'undefined') {
    // On server, always create a new client
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  // On client, reuse the singleton
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  return client
}
