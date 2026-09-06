import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDhaka } from "@/lib/time";
import type { CsvUpload } from "@/lib/supabase/database.types";

export function RecentUploads({ uploads }: { uploads: CsvUpload[] }) {
  const rows = uploads.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent uploads</CardTitle>
        <CardDescription>
          Last {uploads.length > 6 ? "6 of " : ""}
          {uploads.length || 0} CSV imports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">No uploads yet.</p>
            <Button variant="outline" size="sm" render={<Link href="/upload" />}>
              Upload CSV
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead className="text-right">Updated</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="max-w-[16rem] sm:max-w-xs">
                    <span className="block truncate font-mono text-sm font-medium" title={upload.filename}>
                      {upload.filename}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{upload.inserted_count} new</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{upload.updated_count} updated</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {formatDhaka(upload.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {uploads.length > 0 ? (
          <div className="mt-3">
            <Button variant="link" size="sm" render={<Link href="/upload" />}>
              All uploads
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
