import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { authCookieOptions, REMEMBER_COOKIE, rememberFromCookie } from "@/lib/supabase/remember"

// ──────────────────────────────────────────────────────────
// LOKSHIFT OPERATIONAL RBAC MATRIX (Section 4)
// ──────────────────────────────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/users': ['admin'],
  '/dashboard/customers': ['admin', 'dispatcher'],
  '/dashboard/reports': ['admin', 'dispatcher'],
  '/dashboard/personnel': ['admin', 'dispatcher'],
  '/dashboard/plans/week': ['admin', 'dispatcher'],
  '/dashboard/times/approvals': ['admin', 'dispatcher'],
  '/dashboard/settings/security': ['admin'],
  '/dashboard/settings/billing': ['admin'],
  '/dashboard/settings/integrations': ['admin'],
  '/dashboard/settings/work-models': ['admin'],
  '/dashboard/plans': ['admin', 'dispatcher', 'employee'],
  '/dashboard/times': ['admin', 'dispatcher', 'employee'],
  '/dashboard/time-account': ['admin', 'dispatcher', 'employee'],
  '/dashboard/per-diem': ['admin', 'dispatcher', 'employee'],
  '/dashboard/holiday-bonus': ['admin', 'dispatcher', 'employee'],
}

const STATIC_FILE_RE = /\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|js|map|txt|xml|json|webmanifest|woff2?|ttf|otf|pdf|mp3|mp4|webm)$/i

// Entry pages: a signed-in user is sent straight to the dashboard.
const SIGNED_IN_REDIRECT_ROUTES = ['/', '/login', '/register']
// Auth flows that must work with or without a session (no redirect).
const AUTH_FLOW_ROUTES = ['/forgot-password', '/auth/callback', '/auth/auth-code-error']
// Authenticated user must still be able to reach /change-password even when
// must_change_password is TRUE — otherwise they'd loop forever.
const PASSWORD_CHANGE_ROUTE = '/change-password'

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  let response = NextResponse.next({ request })

  // 1. Static/API Bypass. Only real static file extensions — a bare "."
  // check let "/dashboard/users/x.y" skip the auth + RBAC guard.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    (STATIC_FILE_RE.test(pathname) && !pathname.startsWith('/dashboard') && !pathname.startsWith('/onboarding'))
  ) {
    return response
  }

  // 2. Auth flows (password recovery, email links) never redirect.
  if (AUTH_FLOW_ROUTES.some(route => pathname.startsWith(route))) {
    return response
  }

  // 3. Supabase Auth Session. getUser() refreshes an expired access token;
  // the new tokens land in `refreshedCookies` and MUST reach the browser on
  // every response below — refresh tokens are single-use, so dropping them
  // (e.g. on a redirect) makes the next refresh fail and signs the user out.
  const remember = rememberFromCookie(request.cookies.get(REMEMBER_COOKIE)?.value)
  let refreshedCookies: { name: string; value: string; options?: Record<string, any> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          refreshedCookies = cookiesToSet.map(({ name, value, options }) => ({
            name,
            value,
            options: authCookieOptions(options, remember),
          }))
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          refreshedCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  /** Redirect that keeps refreshed session cookies (with their lifetime). */
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    const redirectResponse = NextResponse.redirect(url)
    refreshedCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // 4. Signed in → entry pages go straight to the dashboard (password
  // change and onboarding are enforced from there).
  if (SIGNED_IN_REDIRECT_ROUTES.includes(pathname)) {
    return user ? redirectTo('/dashboard') : response
  }

  // 5. Force Authentication for Dashboard
  if (!user) {
    // /change-password stays reachable without a session: password-reset
    // links land there before the browser has exchanged the reset code.
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return redirectTo('/login')
    }
    return response
  }

  // 6. RBAC & Onboarding Guard (Only for Dashboard/Onboarding routes)
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isOnboardingRoute = pathname === '/onboarding'
  const isPasswordChangeRoute = pathname === PASSWORD_CHANGE_ROUTE

  if (isDashboardRoute || isOnboardingRoute || isPasswordChangeRoute) {
    // Optimization: Only fetch profile if we are in the dashboard/onboarding silo
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed, must_change_password')
      .eq('id', user.id)
      .single()

    // Force first-login password change before anything else (Section 5.1).
    // We never "kick off" /change-password — any authenticated user is
    // allowed to visit it (e.g. arriving via the forgot-password email).
    // The forced direction only goes ONE way: dashboard → /change-password.
    const mustChangePassword = (profile as any)?.must_change_password === true
    if (mustChangePassword && !isPasswordChangeRoute) {
      return redirectTo(PASSWORD_CHANGE_ROUTE)
    }

    // Default role logic
    let role = (profile?.role || user.user_metadata?.role || 'employee').toLowerCase()
    if (role === 'administrator') role = 'admin'
    if (role === 'disponent') role = 'dispatcher'
    if (!['admin', 'dispatcher', 'employee'].includes(role)) role = 'employee'

    const onboardingCompleted = profile?.onboarding_completed ?? false

    // A. Onboarding Guard (Force ONLY Employees to complete)
    const needsOnboarding = role === 'employee' && !onboardingCompleted

    if (needsOnboarding && !isOnboardingRoute && !pathname.startsWith('/auth/')) {
      return redirectTo('/onboarding')
    }

    // B. Case: Non-employees or completed employees on onboarding page -> Dashboard
    if (isOnboardingRoute && (role !== 'employee' || onboardingCompleted)) {
      return redirectTo('/dashboard')
    }

    // C. Strict RBAC Enforcement
    if (isDashboardRoute) {
      for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
          console.warn(`[Middleware] Unauthorized: ${role} -> ${pathname}`)
          return redirectTo('/dashboard')
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
