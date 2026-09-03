import { CsvUploader } from "@/components/csv-uploader";
import { UploadHistory } from "@/components/upload-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUploads } from "@/app/actions";

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
          <UploadHistory uploads={uploads} />
        </CardContent>
      </Card>
    </div>
  );
}
