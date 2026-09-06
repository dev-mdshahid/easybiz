import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_oklch(0.42_0.14_252_/_0.7)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
        <rect x="4" y="4" width="16" height="5.2" rx="2.6" opacity="0.38" />
        <rect x="4" y="9.4" width="16" height="5.2" rx="2.6" opacity="0.68" />
        <rect x="4" y="14.8" width="16" height="5.2" rx="2.6" />
      </svg>
    </span>
  );
}
