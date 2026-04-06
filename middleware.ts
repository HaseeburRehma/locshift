import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// ──────────────────────────────────────────────────────────
// LOKSHIFT OPERATIONAL RBAC MATRIX (Section 4)
// ──────────────────────────────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/users': ['admin'],
  '/dashboard/customers': ['admin', 'dispatcher'],
  '/dashboard/reports': ['admin', 'dispatcher'],
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

const PUBLIC_AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/auth/callback']

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  let response = NextResponse.next({ request })

  // 1. Static/API Bypass
  if (
    pathname.startsWith('/api/') || 
    pathname === '/' || 
    pathname.startsWith('/_next') || 
    pathname.includes('.')
  ) {
    return response
  }

  // 2. Public Auth Bypass
  if (PUBLIC_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return response
  }

  // 3. Supabase Auth Session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 4. Force Authentication for Dashboard
  if (!user) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // 5. Already Authenticated Redirect
  if (PUBLIC_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 6. Role Discovery & Security Hardening
  let role = (user.user_metadata?.role || '').toLowerCase()
  // Always fetch onboarding_completed from the DB (source of truth).
  // Auth metadata may not have this field set if the user registered before
  // the flag was introduced, causing a redirect loop to /onboarding.
  let onboardingCompleted = false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile) {
    // Standardize DB Role as primary authoritative source (SoT)
    const dbRole = (profile.role || '').toLowerCase()
    
    if (dbRole === 'administrator' || dbRole === 'admin') role = 'admin'
    else if (dbRole === 'dispatcher' || dbRole === 'disponent') role = 'dispatcher'
    else if (dbRole === 'employee') role = 'employee'
    else role = 'employee' // default fallback

    onboardingCompleted = profile.onboarding_completed ?? false
  } else if (!role) {
    role = 'employee' // Fallback for new/unprovisioned users
  }

  // Standardize roles ('admin', 'dispatcher', 'employee')
  if (role === 'administrator' || role === 'admin') role = 'admin'
  if (role === 'disponent') role = 'dispatcher'
  if (!role) role = 'employee'

  // A. Onboarding Guard (Force ONLY Employees to complete - Section 4.3)
  const isOnboardingRoute = pathname === '/onboarding'
  // Admins and dispatchers NEVER need onboarding, regardless of the DB flag.
  // Employees need it only if it hasn't been completed yet.
  const needsOnboarding = role === 'employee' && onboardingCompleted === false
  
  if (needsOnboarding && !isOnboardingRoute && !pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    const redirectResponse = NextResponse.redirect(url)
    // IMPORTANT: Pass along the cookies from the Supabase client response
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // B. Case: Non-employees on onboarding page should go to dashboard
  if (isOnboardingRoute && role !== 'employee') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // C. Case: Onboarding completed employees on onboarding page should go to dashboard
  if (isOnboardingRoute && role === 'employee' && onboardingCompleted) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // D. Strict RBAC Enforcement (Dashboard Routes)
  const isDashboardRoute = pathname.startsWith('/dashboard')
  if (isDashboardRoute) {
    for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(role)) {
          console.warn(`[Middleware] Unauthorized access attempt: ${role} -> ${pathname}`)
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
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
