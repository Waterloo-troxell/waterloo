"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RecoveryCodesList } from "@/app/_components/recovery-codes";
import { Button, CodeField, Notice } from "@/app/_components/ui";
import { verifyTotpCode } from "@/lib/auth/verify-totp";
import { browserSupabase } from "@/lib/supabase/browser";

/** New recovery codes need a 2FA code entered just now: a fresh-2FA check. */
export function RegenerateCodes() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (codes) {
    return (
      <div className="space-y-4">
        <Notice tone="ok">Your old codes no longer work. Here are your new ones, shown once.</Notice>
        <RecoveryCodesList codes={codes} />
        <Button
          type="button"
          variant="quiet"
          onClick={() => {
            setCodes(undefined);
            setOpen(false);
            router.refresh();
          }}
        >
          Done
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="quiet" onClick={() => setOpen(true)}>
        Make new codes
      </Button>
    );
  }

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
    const { data, error } = await browserSupabase().rpc("generate_recovery_codes");
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCodes(data as string[]);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <p className="text-sm text-text-muted">
        This replaces all your current codes. Confirm it is you with a 2FA code first.
      </p>
      <CodeField name="code" autoFocus />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Make new codes"}
        </Button>
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Ends every session of yours except this one. Yours only. */
export function SignOutOtherDevices() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="underline underline-offset-4 hover:text-text"
      onClick={async () => {
        await browserSupabase().auth.signOut({ scope: "others" });
        setDone(true);
        router.refresh();
      }}
    >
      {done ? "Signed out everywhere else" : "Sign out my other devices"}
    </button>
  );
}
