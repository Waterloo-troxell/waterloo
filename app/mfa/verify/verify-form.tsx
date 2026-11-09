"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, CodeField, Notice } from "@/app/_components/ui";
import { verifyTotpCode } from "@/lib/auth/verify-totp";

export function VerifyForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const problem = await verifyTotpCode(String(new FormData(event.currentTarget).get("code")));
    if (problem) {
      setBusy(false);
      setError(problem);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <CodeField name="code" autoFocus />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Checking…" : "Continue"}
      </Button>
    </form>
  );
}
