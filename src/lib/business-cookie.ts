import { cookies } from "next/headers";

export const BUSINESS_COOKIE = "easybiz_business_id";

export function businessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export async function clearBusinessCookie() {
  const store = await cookies();
  store.set(BUSINESS_COOKIE, "", { ...businessCookieOptions(), maxAge: 0 });
}
