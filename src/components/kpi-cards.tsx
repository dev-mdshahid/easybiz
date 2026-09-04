import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            : "Upload a Pathao paid-invoice CSV for this business to see revenue, fees, and payout."}
        </CardDescription>
      </CardHeader>
      {!needsBusiness ? (
        <CardContent>
          <Link
            href="/upload"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to Upload
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}
