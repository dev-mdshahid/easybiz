import { Suspense } from "react";

import { listUploads } from "@/app/actions";
import { CsvUploader } from "@/components/csv-uploader";
import { UploadSkeleton } from "@/components/page-skeletons";
import { UploadHistory } from "@/components/upload-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

async function UploadHistoryBody() {
  const uploads = await listUploads();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload history</CardTitle>
        <CardDescription>Newest first</CardDescription>
      </CardHeader>
      <CardContent>
        <UploadHistory uploads={uploads} />
      </CardContent>
    </Card>
  );
}

export default function UploadPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="page-title">Upload CSV</h1>
        <p className="text-sm text-muted-foreground">
          Export paid invoices from Pathao Merchant and drop the file here. The same
          consignment id updates instead of duplicating.
        </p>
      </div>
      <CsvUploader />
      <Suspense fallback={<UploadSkeleton />}>
        <UploadHistoryBody />
      </Suspense>
    </div>
  );
}
