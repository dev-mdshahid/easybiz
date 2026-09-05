import { updatePassword } from "@/app/auth-actions";
import { AuthForm, AuthLinks } from "@/components/auth-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdatePasswordPage() {
  return (
    <AuthForm
      description="Choose a new password."
      action={updatePassword}
      submitLabel="Update password"
      pendingLabel="Updating…"
      footer={<AuthLinks links={[{ href: "/login", label: "Back to sign in" }]} />}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
    </AuthForm>
  );
}
