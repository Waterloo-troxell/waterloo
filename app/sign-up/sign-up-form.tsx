"use client";

import { useState } from "react";
import { Button, Field, Notice } from "@/app/_components/ui";
import { browserSupabase } from "@/lib/supabase/browser";

export function SignUpForm() {
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await browserSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "weak_password"
          ? "Use at least 12 characters."
          : error.code === "over_email_send_rate_limit"
            ? "Too many emails sent in the last hour. Wait a while, then try again."
            : error.message,
      );
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <Notice tone="ok">
        Check <strong>{sentTo}</strong> for a confirmation link, and open it in this same
        browser. Then you will set up 2FA.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
        hint="At least 12 characters. A password manager can make one for you."
      />
      <Field
        label="Password again"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={12}
        required
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
