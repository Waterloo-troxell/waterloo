"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RecoveryCodesList } from "@/app/_components/recovery-codes";
import { Button, CodeField, Mono, Notice } from "@/app/_components/ui";
import { browserSupabase } from "@/lib/supabase/browser";

type Enrollment = { factorId: string; qr: string; secret: string };

export function SetupFlow() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [codes, setCodes] = useState<string[]>();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // React runs effects twice in development. Enrol once.
    if (started.current) return;
    started.current = true;
    (async () => {
      const supabase = browserSupabase();
      // Clear out a half-finished setup from an earlier visit.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? []) {
        if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator app (${new Date().toISOString().slice(0, 10)})`,
        issuer: "Waterloo",
      });
      if (error) {
        setError(`Could not start 2FA setup: ${error.message}`);
        return;
      }
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, []);

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    setError("");
    setBusy(true);
    const supabase = browserSupabase();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    const verified = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    if (verified.error) {
      setBusy(false);
      setError("That code did not match. Check the app shows Waterloo, then try the newest code.");
      return;
    }
    const made = await supabase.rpc("generate_recovery_codes");
    setBusy(false);
    if (made.error) {
      setError(`2FA is on, but recovery codes could not be made: ${made.error.message}. You can make them in Settings.`);
      setCodes([]);
      return;
    }
    setCodes(made.data as string[]);
  }

  if (codes) {
    return (
      <div className="space-y-5">
        <Notice tone="ok">2FA is on.</Notice>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {codes.length > 0 ? (
          <>
            <div>
              <h2 className="text-sm font-semibold">Your 10 recovery codes</h2>
              <p className="mt-1 text-sm text-text-muted">
                If you lose your phone, one of these lets you set up 2FA again. This is the only
                time they are shown.
              </p>
            </div>
            <RecoveryCodesList codes={codes} />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-gold)]"
              />
              I have saved these somewhere other than my phone.
            </label>
          </>
        ) : null}
        <Button
          type="button"
          className="w-full"
          disabled={codes.length > 0 && !saved}
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          Continue to Waterloo
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return error ? <Notice tone="error">{error}</Notice> : <p className="text-sm text-text-muted">Preparing…</p>;
  }

  return (
    <form onSubmit={onVerify} className="space-y-5">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-text-muted">
        <li>Open your authenticator app and add a new account.</li>
        <li>Scan this code with it.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>
      {/* A data: URI from Supabase, so next/image adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={enrollment.qr}
        alt="QR code to scan with your authenticator app"
        className="mx-auto size-48 rounded-md bg-white p-2"
      />
      <details className="text-sm text-text-muted">
        <summary className="cursor-pointer">Can&apos;t scan? Type this key instead</summary>
        <p className="mt-2">
          <Mono>{enrollment.secret}</Mono>
        </p>
      </details>
      <CodeField name="code" autoFocus />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Checking…" : "Turn on 2FA"}
      </Button>
    </form>
  );
}
