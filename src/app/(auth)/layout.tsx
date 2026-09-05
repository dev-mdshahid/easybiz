import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-4 py-10">
      {children}
    </div>
  );
}
