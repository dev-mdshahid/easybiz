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
}: {
  cash: CashPosition;
  hasBusiness: boolean;
  variant?: "card" | "row";
  share?: number;
}) {
  return (
    <PositionStat
      icon={Landmark}
      title="You owe"
      value={hasBusiness ? formatBdt(cash.liabilities_outstanding) : "—"}
      variant={variant}
      share={share}
      shareTone="owe"
      action={
        hasBusiness ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Manage liabilities"
            render={<Link href="/liabilities" />}
          >
            <ArrowUpRight />
          </Button>
        ) : null
      }
    >
      {hasBusiness ? (
        <p className="text-xs text-muted-foreground">Unpaid loans</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create a business from the sidebar, then record loans.
        </p>
      )}
    </PositionStat>
  );
}
