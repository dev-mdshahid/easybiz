import Link from "next/link";

import { cn } from "@/lib/utils";

export function DatePresets({
  preset,
  basePath = "/",
  tone = "default",
}: {
  preset: string;
  basePath?: string;
  tone?: "default" | "onPrimary";
}) {
  const options = [
    { id: "all", label: "All time" },
    { id: "month", label: "This month" },
    { id: "30d", label: "Last 30 days" },
  ];
  const onPrimary = tone === "onPrimary";

  return (
    <nav
      aria-label="Date range"
      className={cn(
        "inline-flex max-w-full flex-wrap rounded-xl p-1",
        onPrimary
          ? "bg-primary-foreground/12"
          : "bg-muted ring-1 ring-foreground/8",
      )}
    >
      {options.map((option) => (
        <Link
          key={option.id}
          href={`${basePath}?preset=${option.id}`}
          aria-current={preset === option.id ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
            preset === option.id
              ? onPrimary
                ? "bg-primary-foreground text-primary shadow-[0_6px_14px_-8px_oklch(0.2_0.05_252_/_0.45)]"
                : "bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_oklch(0.42_0.14_252_/_0.7)]"
              : onPrimary
                ? "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
