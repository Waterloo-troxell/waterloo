import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/app/_components/sign-out-button";
import { AuthShell } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your 2FA code" };

export default async function MfaVerifyPage() {
  await requireStage("needs-2fa-code");
  return (
    <AuthShell title="Enter your 2FA code" lead="Open your authenticator app and find Waterloo.">
      <VerifyForm />
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm text-text-muted">
        <Link href="/recover" className="underline underline-offset-4 hover:text-text">
          Lost your phone?
        </Link>
        <SignOutButton />
      </div>
    </AuthShell>
  );
}
