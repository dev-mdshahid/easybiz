import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "shazelle_access";

export function pinEnabled(): boolean {
  return Boolean(process.env.APP_PIN?.trim());
}

export async function unlock(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const expected = process.env.APP_PIN ?? "";
  if (!expected || pin !== expected) {
    redirect("/unlock?error=1");
  }
  const store = await cookies();
  store.set(COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function lock() {
  const store = await cookies();
  store.delete(COOKIE);
  redirect("/unlock");
}
