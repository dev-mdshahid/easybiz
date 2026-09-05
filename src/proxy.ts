import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAnonymousClaims,
  isRecoveryClaims,
  safeNextPath,
} from "@/lib/auth-session";

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
]);

const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password"]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

function redirectWithCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  search = "",
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = search;
  return copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    if (isPublicPath(pathname)) return supabaseResponse;
    return redirectWithCookies(request, supabaseResponse, "/login");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([headerName, headerValue]) =>
          supabaseResponse.headers.set(headerName, headerValue),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const authed = Boolean(claims) && !isAnonymousClaims(claims);
  const recovering = authed && isRecoveryClaims(claims);

  if (recovering) {
    const allowed =
      pathname === "/update-password" || pathname === "/auth/callback";
    if (!allowed) {
      return redirectWithCookies(request, supabaseResponse, "/update-password");
    }
    return supabaseResponse;
  }

  if (!authed && !isPublicPath(pathname)) {
    const next = safeNextPath(`${pathname}${request.nextUrl.search}`);
    const search =
      next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return redirectWithCookies(request, supabaseResponse, "/login", search);
  }

  if (authed && AUTH_PAGES.has(pathname)) {
    return redirectWithCookies(request, supabaseResponse, "/");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
