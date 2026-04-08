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

  // 6. RBAC & Onboarding Guard (Only for Dashboard/Onboarding routes)
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isOnboardingRoute = pathname === '/onboarding'

  if (isDashboardRoute || isOnboardingRoute) {
    // Optimization: Only fetch profile if we are in the dashboard/onboarding silo
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single()

    // Default role logic
    let role = (profile?.role || user.user_metadata?.role || 'employee').toLowerCase()
    if (role === 'administrator') role = 'admin'
    if (role === 'disponent') role = 'dispatcher'
    if (!['admin', 'dispatcher', 'employee'].includes(role)) role = 'employee'

    const onboardingCompleted = profile?.onboarding_completed ?? false
    
    // A. Onboarding Guard (Force ONLY Employees to complete)
    const needsOnboarding = role === 'employee' && !onboardingCompleted
    
    if (needsOnboarding && !isOnboardingRoute && !pathname.startsWith('/auth/')) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // B. Case: Non-employees or completed employees on onboarding page -> Dashboard
    if (isOnboardingRoute && (role !== 'employee' || onboardingCompleted)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }

    // C. Strict RBAC Enforcement
    if (isDashboardRoute) {
      for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
          console.warn(`[Middleware] Unauthorized: ${role} -> ${pathname}`)
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
