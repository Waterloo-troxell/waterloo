"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "./env";

let client: SupabaseClient | undefined;

/** The Supabase client for code running in the browser. One per tab. */
export function browserSupabase(): SupabaseClient {
  client ??= createBrowserClient(supabaseUrl, supabasePublishableKey);
  return client;
}
