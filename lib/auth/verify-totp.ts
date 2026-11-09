"use client";

import { browserSupabase } from "@/lib/supabase/browser";

/**
 * Check a 6-digit code against the person's own 2FA factor. Used at sign-in
 * and wherever a fresh 2FA check is needed. Returns an error message for
 * people, or null when the code was right.
 */
export async function verifyTotpCode(rawCode: string): Promise<string | null> {
  const supabase = browserSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");
  if (error || !factor) return "No 2FA is set up on this account.";

  const result = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: rawCode.trim(),
  });
  return result.error ? "That code did not match. Try the newest one in the app." : null;
}
