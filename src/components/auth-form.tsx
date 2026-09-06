"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";

import type { AuthResult } from "@/app/auth-actions";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function AuthForm({
  description,
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  footer,
  children,
}: {
  description: string;
  action: (formData: FormData) => Promise<AuthResult>;
  submitLabel: string;
  pendingLabel: string;
  successMessage?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BrandMark className="size-10 rounded-2xl" />
        <div>
          <h1 className="page-title">EasyBiz</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <form
        className="grid gap-3"
        action={(formData) => {
          startTransition(async () => {
            setError(null);
            setMessage(null);
            try {
              const result = await action(formData);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setMessage(successMessage ?? null);
            } catch (caught) {
              if (isNextRedirect(caught)) throw caught;
              setError("Something went wrong. Try again.");
            }
          });
        }}
      >
        {children}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </form>
      {footer}
    </div>
  );
}

export function AuthLinks({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? " · " : null}
          <Link href={link.href} className="underline-offset-4 hover:underline">
            {link.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
