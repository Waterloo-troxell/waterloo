import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  await requireStage("signed-out", "expired");
  return (
    <AuthShell
      title="Create your account"
      lead={
        <>
          Use your own personal email. Signing up does not make you an owner: both owners
          approve that together, once. Already have an account?{" "}
          <Link href="/sign-in" className="text-text underline underline-offset-4">
            Sign in
          </Link>
          .
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
