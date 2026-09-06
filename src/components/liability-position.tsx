import Link from "next/link";

import type { CashPosition } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBdt } from "@/lib/money";

export function LiabilityPositionCard({
  cash,
  hasBusiness,
}: {
  cash: CashPosition;
  hasBusiness: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>You owe</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
          {hasBusiness ? formatBdt(cash.liabilities_outstanding) : "—"}
        </CardTitle>
        {hasBusiness ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" render={<Link href="/liabilities" />}>
              Manage
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-2">
        {hasBusiness ? (
          <>
            <p className="text-sm text-muted-foreground">
              Unpaid principal on recorded loans. Borrowing adds cash; repayment
              lowers cash. Neither changes profit.
            </p>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/liabilities"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Liabilities
              </Link>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Create a business from the sidebar, then record loans you take for
            it.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
