import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { withTimeout } from "./lib/supabase/with-timeout"

// Define permission matrix for middleware (simplified for route protection)
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard/leads': ['admin', 'manager', 'disponent', 'viewer'],
  '/dashboard/jobs': ['admin', 'manager', 'disponent', 'technician', 'viewer'],
  '/dashboard/technicians': ['admin', 'manager', 'disponent', 'viewer'],
  '/dashboard/reviews': ['admin', 'manager', 'disponent', 'viewer', 'partner_admin'],
  '/dashboard/automations': ['admin', 'manager'],
  '/dashboard/settings': ['admin', 'manager'],
  '/dashboard/partners': ['admin', 'manager'],
  '/dashboard/finance': ['admin', 'manager'],
  '/dashboard/marketplace': ['admin', 'manager'],
  '/partner': ['partner_admin', 'partner_agent'],
}
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Fast-Path: Bypass ALL API routes and static assets entirely.
  //    Each /api/* route handles its own authentication internally.
  if (pathname.startsWith('/api/') || pathname === '/') {
    return response
  }

  // Also bypass auth pages
  if (pathname.startsWith('/auth')) {
    return response
  }

  // 2. Check for cached role in cookies to avoid redundant DB hits
  const cachedRole = request.cookies.get('user-role')?.value

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // 3. Reverted to getUser for security as requested by Supabase warnings
    const controller = new AbortController()
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser() as any,
      3000,
      { data: { user: null }, error: null } as any,
      controller
    )

    // Auth requirement: at this point, the route is always a protected dashboard/partner page.
    // If no session → clear stale cookie and redirect to login.
    if (!user) {
      const loginRedirect = NextResponse.redirect(new URL('/auth/login', request.url))
      loginRedirect.cookies.delete('user-role')
      return loginRedirect
    }

    if (user) {
      let role = cachedRole || 'viewer'

      // 4. If role not cached, fetch it
      if (!cachedRole) {
        const profileController = new AbortController()
        const { data: profile } = await withTimeout(
          supabase.from('profiles').select('role').eq('id', user.id).single() as any,
          2000,
          { data: null, error: null } as any,
          profileController
        )
        role = profile?.role || 'viewer'
        
        // Cache role for 1 hour to speed up subsequent requests
        response.cookies.set('user-role', role, { maxAge: 3600, path: '/' })
      }

      // 5. Role-based redirects for the root /dashboard
      if (pathname === '/dashboard') {
        if (role === 'technician') return NextResponse.redirect(new URL('/dashboard/jobs', request.url))
        if (['partner_admin', 'partner_agent'].includes(role)) {
          return NextResponse.redirect(new URL('/partner/dashboard', request.url))
        }
      }

      // 6. Route protection
      for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route)) {
          if (!allowedRoles.includes(role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
        }
      }
    }
  } catch (err) {
    console.error(`[middleware] Error on ${pathname}:`, err)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
