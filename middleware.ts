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
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await withTimeout(
      supabase.auth.getUser() as any,
      3000,
      { data: { user: null }, error: null } as any
    ) as any

    // Public routes
    const publicPrefixes = ['/auth', '/api/inquiry', '/api/leads', '/api/agents', '/review']
    const isPublicRoute = publicPrefixes.some(p => pathname.startsWith(p)) || pathname === '/'
    
    if (isPublicRoute && pathname !== '/auth/login' && pathname !== '/auth/sign-up') {
      return response
    }

    // Auth requirement
    if (!user && !isPublicRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get user role from profiles
    if (user) {
      const profileResult: any = await withTimeout(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single() as any, // Cast to any to avoid PostgrestBuilder vs Promise mismatch
        3000,
        { data: null, error: null } as any
      )

      const profile = profileResult?.data
      const role = profile?.role || 'viewer'

      // 1. Role-based redirects for the root /dashboard
      if (pathname === '/dashboard') {
        if (role === 'technician') {
          return NextResponse.redirect(new URL('/dashboard/jobs', request.url))
        }
        if (['partner_admin', 'partner_agent'].includes(role)) {
          return NextResponse.redirect(new URL('/partner/dashboard', request.url))
        }
      }

      // 2. Route protection
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
