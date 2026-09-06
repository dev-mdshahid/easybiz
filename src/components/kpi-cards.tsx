import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyBooks({ needsBusiness = false }: { needsBusiness?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {needsBusiness ? "Create a business" : "No invoices yet"}
        </CardTitle>
        <CardDescription>
          {needsBusiness
            ? "Create a business from the sidebar, then upload a Pathao paid-invoice CSV."
            : "Upload a Pathao paid-invoice CSV to see payout and profit."}
        </CardDescription>
      </CardHeader>
      {!needsBusiness ? (
        <CardFooter>
          <Button render={<Link href="/upload" />}>Upload CSV</Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
