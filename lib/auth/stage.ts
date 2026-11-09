import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

/**
 * Where someone is in signing in. Every page asks for the stage it expects
 * and sends everyone else to the right place.
 *
 * This is for showing the right screen, not for security. The database
 * refuses data to anyone without 2FA on a sign-in younger than 30 days, so a
 * person who skipped a screen would just see empty pages.
 */
export type Stage =
  | "no-database" //   this deploy was built without a database connection
  | "signed-out"
  | "needs-2fa-setup" // signed in with a password, no 2FA yet
  | "needs-2fa-code" //  signed in with a password, 2FA code not entered yet
  | "expired" //         signed in more than 30 days ago: sign in again
  | "ready";

export const pageFor: Record<Stage, string> = {
  "no-database": "/",
  "signed-out": "/sign-in",
  "needs-2fa-setup": "/mfa/setup",
  "needs-2fa-code": "/mfa/verify",
  expired: "/sign-in?expired=1",
  ready: "/",
};

export type StageInfo = {
  stage: Stage;
  supabase?: SupabaseClient;
  userId?: string;
  email?: string;
};

export async function currentStage(): Promise<StageInfo> {
  if (!supabaseConfigured) return { stage: "no-database" };

  const supabase = await serverSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { stage: "signed-out", supabase };

  const base = { supabase, userId: claims.sub, email: claims.email as string | undefined };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // nextLevel aal1 means no verified 2FA factor exists (or it was just
  // removed with a recovery code): set one up.
  if (!aal || aal.nextLevel !== "aal2") return { stage: "needs-2fa-setup", ...base };
  if (aal.currentLevel !== "aal2") return { stage: "needs-2fa-code", ...base };

  const { data: trusted } = await supabase.rpc("session_is_trusted");
  if (trusted !== true) return { stage: "expired", ...base };

  return { stage: "ready", ...base };
}

/** Render this page only at one of `allowed` stages; send everyone else on. */
export async function requireStage(...allowed: Stage[]): Promise<StageInfo> {
  const info = await currentStage();
  if (!allowed.includes(info.stage)) redirect(pageFor[info.stage]);
  return info;
}
