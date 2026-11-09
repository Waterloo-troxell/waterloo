import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Runs before every page. Its one job is to keep the sign-in cookie fresh:
 * access tokens last an hour, and this swaps an expiring one for a new one.
 *
 * It does NOT decide who may see what. Each page checks the person's sign-in
 * stage itself (lib/auth/stage.ts), and the database refuses data to anyone
 * without 2FA no matter what any page does.
 */
export async function proxy(request: NextRequest) {
  // If Supabase sends a confirmation link to the site root (it does when the
  // callback address is not on its allow list), pass it to the callback.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    return NextResponse.redirect(callback);
  }

  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Validates the token and refreshes it if needed. Keep this call directly
  // after creating the client, as Supabase's guide says.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Everything except static files and images.
  matcher: ["/((?!_next/static|_next/image|icon|apple-icon|manifest|sw\\.js|robots\\.txt|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
