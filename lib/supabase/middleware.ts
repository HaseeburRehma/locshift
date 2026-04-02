import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Allow public routes immediately to prevent stalls
    const publicRoutes = [
        "/login",
        "/register",
        "/register-success",
        "/auth/error",
        "/review",
        "/",
        "/api/inquiry",
        "/api/leads",
        "/api/agents"
    ];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    if (isPublicRoute) {
        return supabaseResponse;
    }

    let user = null;
    try {
        const { withTimeout } = await import("./with-timeout");
        const { data } = await withTimeout(
            supabase.auth.getUser(),
            5000,
            { data: { user: null }, error: null } as any
        );
        user = data.user;
    } catch (e) {
        console.error("Supabase auth check failed (connectivity issue):", e);
        // Continue as unauthenticated instead of hanging the entire request
    }

    if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
