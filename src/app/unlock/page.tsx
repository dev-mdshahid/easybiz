import { unlock } from "@/app/unlock/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shazelle Books</h1>
        <p className="text-sm text-muted-foreground">Enter the shared access PIN.</p>
      </div>
      <form action={unlock} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="pin">PIN</Label>
          <Input id="pin" name="pin" type="password" autoComplete="current-password" />
        </div>
        {params.error ? (
          <p className="text-sm text-destructive">That PIN is not correct.</p>
        ) : null}
        <Button type="submit">Unlock</Button>
      </form>
    </div>
  );
}
