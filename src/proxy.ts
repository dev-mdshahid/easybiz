import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "shazelle_access";

export function proxy(request: NextRequest) {
  const pin = process.env.APP_PIN?.trim();
  if (!pin) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/unlock" || pathname.startsWith("/unlock/")) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE)?.value === pin) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
