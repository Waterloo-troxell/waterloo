import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

/**
 * Where the "confirm your email" link lands. It turns the link into a signed-in
 * session, then hands over to the home page, which sends you to 2FA setup.
 *
 * Handles both link styles Supabase can send: a one-time `code` (the default)
 * and a `token_hash` (if the email template is changed to use one).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const supabase = await serverSupabase();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("no code in the link") };

  return NextResponse.redirect(new URL(error ? "/sign-in?confirm=failed" : "/", url.origin));
}
