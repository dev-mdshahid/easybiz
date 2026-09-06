import { requestPasswordReset } from "@/app/auth-actions";
import { AuthForm, AuthLinks } from "@/components/auth-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const instant = false;

export default function ForgotPasswordPage() {
  return (
    <AuthForm
      key="forgot-password"
      description="We’ll email a reset link if this account exists."
      action={requestPasswordReset}
      submitLabel="Send reset link"
      pendingLabel="Sending…"
      successMessage="Check your email for a reset link."
      footer={<AuthLinks links={[{ href: "/login", label: "Back to sign in" }]} />}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
    </AuthForm>
  );
}
