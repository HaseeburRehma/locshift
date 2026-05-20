/**
 * Friendly landing page for failed magic-link exchanges.
 *
 * The Supabase reset/recovery email is single-use. If the user clicks the
 * link twice — or after the TTL expires — Supabase appends
 * `?error=access_denied&error_code=otp_expired&error_description=...` to
 * /auth/callback. The callback route forwards those params here so the UI
 * can show why the link failed and offer a clear next step.
 *
 * Server-component shell that wraps the client content in <Suspense>.
 * Required by Next.js 16: a client component reading `useSearchParams()`
 * during prerender deopts the route unless wrapped in a Suspense boundary,
 * which broke the production build.
 */

import { Suspense } from 'react'
import AuthCodeErrorContent from './content'

// Tell Next.js this page is always dynamic — params are only meaningful at
// request time, and prerendering them adds no value.
export const dynamic = 'force-dynamic'

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<AuthCodeErrorFallback />}>
      <AuthCodeErrorContent />
    </Suspense>
  )
}

function AuthCodeErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0064E0] px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl">
        <div className="h-12 w-12 mx-auto mb-6 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-5 w-3/4 mx-auto mb-3 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 w-full mx-auto rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
  )
}
