import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * The Supabase client for server components, route handlers and server
 * actions. It acts as the signed-in person, through their own session cookie,
 * so row-level security applies exactly as it does in the browser.
 *
 * Make a new one per request; never share one between requests.
 */
export async function serverSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  // Pass the person's browser name along, so a sign-in finished on the server
  // (the email-confirmation link) is listed under their real device in
  // Settings rather than as the server.
  const userAgent = (await headers()).get("user-agent");
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    global: userAgent ? { headers: { "User-Agent": userAgent } } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot set cookies. The proxy refreshes the
          // session on every request, so nothing is lost here.
        }
      },
    },
  });
}
