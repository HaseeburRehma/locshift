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
  const url = request.nextUrl.clone()

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Check for cached role in cookies to avoid redundant DB hits
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

    // 2. Optimized Auth Check: getSession is faster than getUser for middleware
    const controller = new AbortController()
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession() as any,
      2000,
      { data: { session: null }, error: null } as any,
      controller
    )

    const user = session?.user

    // Public routes bypass
    const publicPrefixes = ['/auth', '/api/inquiry', '/api/leads', '/api/agents', '/review']
    const isPublicRoute = publicPrefixes.some(p => pathname.startsWith(p)) || pathname === '/'
    
    if (isPublicRoute && !pathname.startsWith('/dashboard') && !pathname.startsWith('/partner')) {
      return response
    }

    // Auth requirement
    if (!user && !isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (user) {
      let role = cachedRole || 'viewer'

      // 3. If role not cached, fetch it (Parallel would be better but we need user ID)
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

      // 4. Role-based redirects for the root /dashboard
      if (pathname === '/dashboard') {
        if (role === 'technician') return NextResponse.redirect(new URL('/dashboard/jobs', request.url))
        if (['partner_admin', 'partner_agent'].includes(role)) {
          return NextResponse.redirect(new URL('/partner/dashboard', request.url))
        }
      }

      // 5. Route protection
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
