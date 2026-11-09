"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Notice } from "@/app/_components/ui";
import { browserSupabase } from "@/lib/supabase/browser";

export function RecoverForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const supabase = browserSupabase();
    const code = String(new FormData(event.currentTarget).get("code"));
    const { data, error } = await supabase.rpc("redeem_recovery_code", { code });
    if (error || data !== true) {
      setBusy(false);
      setError(error ? error.message : "That code did not match, or it has already been used.");
      return;
    }
    // The old 2FA is gone. Refresh the session so it knows, then set up anew.
    await supabase.auth.refreshSession();
    router.replace("/mfa/setup");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Recovery code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        placeholder="ABCD-EFGH-JKMN"
        className="font-mono tracking-[0.15em]"
        hint="Letters and numbers. Dashes and capitals do not matter."
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Checking…" : "Use this code"}
      </Button>
    </form>
  );
}
