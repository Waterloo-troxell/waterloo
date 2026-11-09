import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, Notice } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; confirm?: string }>;
}) {
  const { stage } = await requireStage("signed-out", "expired");
  const params = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      lead={
        <>
          New here?{" "}
          <Link href="/sign-up" className="text-text underline underline-offset-4">
            Create your account
          </Link>
          .
        </>
      }
    >
      <div className="space-y-4">
        {stage === "expired" || params.expired ? (
          <Notice>You signed in on this device over 30 days ago. Please sign in again.</Notice>
        ) : null}
        {params.confirm === "failed" ? (
          <Notice tone="error">
            That confirmation link did not work. It may have expired, or been opened in a
            different browser. Sign in, or sign up again for a fresh link.
          </Notice>
        ) : null}
        <SignInForm signOutFirst={stage === "expired"} />
      </div>
    </AuthShell>
  );
}
