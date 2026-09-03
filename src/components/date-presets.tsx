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
            "rounded-lg border px-3 py-1.5 text-sm transition-colors",
            preset === option.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
