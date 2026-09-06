import { Suspense } from "react";

import { getCashPosition } from "@/app/actions";
import { getBusinessContext } from "@/app/business-actions";
import { listLiabilities, listLenders, listRepayments } from "@/app/liability-actions";
import { LiabilitiesTable } from "@/components/liabilities-table";
import { LiabilityForm } from "@/components/liability-form";
import { ExpensesSkeleton } from "@/components/page-skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBdt } from "@/lib/money";
import type { LiabilityRepayment } from "@/lib/supabase/database.types";

function groupRepayments(rows: LiabilityRepayment[]) {
  const grouped: Record<number, LiabilityRepayment[]> = {};
  for (const row of rows) {
    const list = grouped[row.liability_id] ?? [];
    list.push(row);
    grouped[row.liability_id] = list;
  }
  return grouped;
}

async function LiabilitiesBody() {
  const [{ current }, loans, repayments, cash, lenders] = await Promise.all([
    getBusinessContext(),
    listLiabilities(),
    listRepayments(),
    getCashPosition(),
    listLenders(),
  ]);

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create a business</CardTitle>
          <CardDescription>
            Create a business from the sidebar before recording loans.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add loan</CardTitle>
          <CardDescription>
            Money you take for the business. It adds cash. Repaying later
            lowers cash. Neither is profit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiabilityForm lenders={lenders} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recorded</CardTitle>
          <CardDescription>
            {formatBdt(cash.liabilities_outstanding)} still owed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiabilitiesTable
            rows={loans}
            repaymentsByLoan={groupRepayments(repayments)}
            cashOnHand={cash.cash_on_hand}
            lenders={lenders}
          />
        </CardContent>
      </Card>
    </>
  );
}

export default function LiabilitiesPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liabilities</h1>
        <p className="text-sm text-muted-foreground">
          Loans from people for this business. Taking a loan adds cash on
          hand (on or after the counted-on day). Repayment lowers cash, not
          period profit. If opening cash already includes a loan, date that
          loan before the counted-on day so cash is not counted twice.
        </p>
      </div>
      <Suspense fallback={<ExpensesSkeleton />}>
        <LiabilitiesBody />
      </Suspense>
    </div>
  );
}
