import Link from "next/link";
import { ArrowUpRight, Landmark } from "lucide-react";

import type { CashPosition } from "@/app/actions";
import { PositionStat } from "@/components/position-stat";
import { Button } from "@/components/ui/button";
import { formatBdt } from "@/lib/money";

export function LiabilityPositionCard({
  cash,
  hasBusiness,
  variant = "card",
  share,
  tone = "default",
}: {
  cash: CashPosition;
  hasBusiness: boolean;
  variant?: "card" | "row";
  share?: number;
  tone?: "default" | "onWell";
}) {
  return (
    <PositionStat
      icon={Landmark}
      title="You owe"
      value={hasBusiness ? formatBdt(cash.liabilities_outstanding) : "—"}
      variant={variant}
      share={share}
      shareTone="owe"
      tone={tone}
      action={
        hasBusiness ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Manage liabilities"
            className={
              tone === "onWell"
                ? "text-current hover:bg-background/10 hover:text-current"
                : undefined
            }
            render={<Link href="/liabilities" />}
          >
            <ArrowUpRight />
          </Button>
        ) : null
      }
    >
      {hasBusiness ? (
        <p className={tone === "onWell" ? "text-xs text-current/65" : "text-xs text-muted-foreground"}>
          Unpaid loans
        </p>
      ) : (
        <p className={tone === "onWell" ? "text-sm text-current/70" : "text-sm text-muted-foreground"}>
          Create a business from the sidebar, then record loans.
        </p>
      )}
    </PositionStat>
  );
}
