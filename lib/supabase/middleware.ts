import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  // /s/* is the QR short-URL redirector. The page itself handles auth so it
  // can preserve the scanned QR through login via ?next=.
  "/s",
  // /api/email/drain authenticates via Bearer CRON_SECRET (called by pg_cron
  // server-to-server — no cookies). Must bypass the cookie-redirect branch.
  "/api/email/drain",
  // /accept-invite consumes a magic-link token from the URL fragment via
  // client-side JS; on first server-rendered request there's no cookie yet
  // and middleware would otherwise bounce to /login. The page itself
  // verifies the session and renders an "invite expired" state if missing.
  "/accept-invite",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated user trying to reach a protected path → /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user — fetch role and apply role gates
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role as "staff" | "student" | "admin" | undefined;
    const isStaffOrAdmin = role === "staff" || role === "admin";
    const home = isStaffOrAdmin ? "/staff/home" : "/student/home";

    // Authed user on an auth page → bounce to their home.
    // EXCEPTION: /reset-password is reachable while authenticated because the
    // password-recovery flow signs the user in (recovery session) and then
    // needs them to land on the reset form. A regular logged-in user can also
    // visit /reset-password directly to change their password — that's fine.
    if (
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/forgot-password"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }

    // Wrong-role gate. Admin counts as staff for all /staff/* routes; the
    // narrower /staff/admin/users surface gates inside the page on is_admin().
    if (role === "student" && pathname.startsWith("/staff")) {
      const url = request.nextUrl.clone();
      url.pathname = "/student/home";
      return NextResponse.redirect(url);
    }
    if (isStaffOrAdmin && pathname.startsWith("/student")) {
      const url = request.nextUrl.clone();
      url.pathname = "/staff/home";
      return NextResponse.redirect(url);
    }
    // /print/* is staff-only (QR print previews). Students bounce home.
    if (role === "student" && pathname.startsWith("/print")) {
      const url = request.nextUrl.clone();
      url.pathname = "/student/home";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
