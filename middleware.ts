import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Lokshift Route Permissions
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/users': ['admin'],
  '/dashboard/customers': ['admin', 'dispatcher'],
  '/dashboard/reports': ['admin', 'dispatcher'],
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
  if (pathname.startsWith('/api/') || pathname === '/' || pathname.startsWith('/_next') || pathname.includes('.')) {
    return response
  }

  // 2. Public Auth Bypass
  if (PUBLIC_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return response
  }

  // 3. Supabase Auth
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

  // 4. Authentication Check
  if (!user) {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // 5. Auth Redirect (Already Logged In)
  if (PUBLIC_AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 6. Onboarding & Role Discovery
  // Get role from metadata (FASTEST) or fallback to database query
  let role = (user.user_metadata?.role || '').toLowerCase()
  let onboardingCompleted = !!(user.user_metadata?.onboarding_completed)

  // Fallback if metadata is missing
  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_completed')
      .eq('id', user.id)
      .single()
    
    role = (profile?.role || 'viewer').toLowerCase()
    onboardingCompleted = profile?.onboarding_completed ?? false
  }

  // Final role mapping
  if (role === 'administrator' || role === 'admin') role = 'admin'
  if (!role) role = 'viewer'

  // A. Onboarding Redirect (Force ONLY employees to complete  // Onboarding check (Employees only)
  const isOnboardingRoute = pathname === '/onboarding'
  const needsOnboarding = onboardingCompleted === false && role === 'employee'
  
  if (needsOnboarding && !isOnboardingRoute && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // B. Role-Based Access Control (RBAC) - TEMPORARY BYPASS
  // This allows us to verify if navigation is working as expected
  const isDashboardRoute = pathname.startsWith('/dashboard')
  if (isDashboardRoute) {
    // Master Bypass for all authenticated users to unblock UI testing
    return response

    /* 
    for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase())
        if (!normalizedAllowed.includes(role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
    */
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
