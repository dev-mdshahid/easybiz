import { Suspense } from "react";

import { signIn } from "@/app/auth-actions";
import { AuthForm, AuthLinks } from "@/components/auth-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/auth-session";

export const instant = false;

async function LoginExtras({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const authError = params.error === "auth";

  return (
    <>
      {authError ? (
        <p className="text-sm text-destructive">
          Could not complete sign-in. Try again.
        </p>
      ) : null}
      {next !== "/" ? <input type="hidden" name="next" value={next} /> : null}
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  return (
    <AuthForm
      key="login"
      description="Sign in with your email and password."
      action={signIn}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      footer={
        <AuthLinks
          links={[
            { href: "/signup", label: "Create an account" },
            { href: "/forgot-password", label: "Forgot password?" },
          ]}
        />
      }
    >
      <Suspense>
        <LoginExtras searchParams={searchParams} />
      </Suspense>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
    </AuthForm>
  );
}
