import Link from "next/link";

import { cn } from "@/lib/utils";

export function DatePresets({
  preset,
  basePath = "/",
}: {
  preset: string;
  basePath?: string;
}) {
  const options = [
    { id: "all", label: "All time" },
    { id: "month", label: "This month" },
    { id: "30d", label: "Last 30 days" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.id}
          href={`${basePath}?preset=${option.id}`}
          className={cn(
            "rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
            preset === option.id
              ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_oklch(0.42_0.14_252_/_0.7)]"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
