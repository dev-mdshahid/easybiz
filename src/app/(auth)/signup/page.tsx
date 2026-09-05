import { signUp } from "@/app/auth-actions";
import { AuthForm, AuthLinks } from "@/components/auth-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <AuthForm
      description="Create an account. Your books stay private to this email."
      action={signUp}
      submitLabel="Create account"
      pendingLabel="Creating…"
      successMessage="Check your email, then sign in."
      footer={<AuthLinks links={[{ href: "/login", label: "Already have an account?" }]} />}
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
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
    </AuthForm>
  );
}
