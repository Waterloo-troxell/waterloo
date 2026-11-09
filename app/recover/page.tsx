import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Use a recovery code" };

export default async function RecoverPage() {
  await requireStage("needs-2fa-code");
  return (
    <AuthShell
      title="Use a recovery code"
      lead="A recovery code removes the 2FA on your own account, so you can set it up again on a new phone. Each code works once."
    >
      <RecoverForm />
      <p className="mt-6 border-t border-border pt-4 text-sm text-text-muted">
        <Link href="/mfa/verify" className="underline underline-offset-4 hover:text-text">
          Back to entering a 2FA code
        </Link>
      </p>
    </AuthShell>
  );
}
