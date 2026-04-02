//app/auth/callback/route.ts

// Bug 4 fix: setAll must write to the *response* cookies, not *request* cookies.
// The request is read-only headers — writing there has no effect on the browser.
// The response is what gets sent back, so that's where session cookies must land.

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Create the redirect response FIRST so we can attach cookies to it
    const redirectUrl = `${origin}${next}`
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Read from the incoming request
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Bug 4 fix: Write to the *response*, not request
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response  // response now has the session cookies attached
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
