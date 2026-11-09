"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Notice } from "@/app/_components/ui";
import { browserSupabase } from "@/lib/supabase/browser";

export function SignInForm({ signOutFirst }: { signOutFirst: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const supabase = browserSupabase();
    // A sign-in past 30 days is ended here, on this device only.
    if (signOutFirst) await supabase.auth.signOut({ scope: "local" });
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setBusy(false);
      setError(
        error.code === "email_not_confirmed"
          ? "Confirm your email first: open the link we sent you."
          : "That email and password did not match.",
      );
      return;
    }
    // The home page sends you on to 2FA.
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
