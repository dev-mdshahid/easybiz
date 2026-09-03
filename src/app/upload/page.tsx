import { CsvUploader } from "@/components/csv-uploader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUploads } from "@/app/actions";
import { formatDhaka } from "@/lib/time";

export default async function UploadPage() {
  const uploads = await listUploads();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload CSV</h1>
        <p className="text-sm text-muted-foreground">
          Export paid invoices from Pathao Merchant and drop the file here. The same
          consignment id updates instead of duplicating.
        </p>
      </div>
      <CsvUploader />
      <Card>
        <CardHeader>
          <CardTitle>Upload history</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing imported yet.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-border py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{upload.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.status} · {upload.inserted_count} new ·{" "}
                      {upload.updated_count} updated · {upload.error_count} skipped
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDhaka(upload.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
