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

  // Supabase appends ?error= / ?error_code= / ?error_description= when the
  // link in the email has already been consumed or has expired. Surface
  // those so the error page can show a useful message instead of a generic
  // "something went wrong".
  const supabaseError = searchParams.get('error')
  const supabaseErrorCode = searchParams.get('error_code')
  const supabaseErrorDescription = searchParams.get('error_description')

  if (code) {
    const redirectUrl = `${origin}${next}`
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    // Fall through to the error page with the Supabase error details.
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error_code=${encodeURIComponent(error.code ?? 'exchange_failed')}&error_description=${encodeURIComponent(error.message)}`
    )
  }

  // Supabase sent us here with explicit error params (most often
  // otp_expired when the user clicks an already-used reset link).
  if (supabaseError || supabaseErrorCode) {
    const params = new URLSearchParams({
      ...(supabaseErrorCode ? { error_code: supabaseErrorCode } : {}),
      ...(supabaseErrorDescription ? { error_description: supabaseErrorDescription } : {}),
    })
    return NextResponse.redirect(`${origin}/auth/auth-code-error?${params.toString()}`)
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
