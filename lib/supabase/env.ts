/**
 * Where the app finds its database. Both values are browser-safe: the
 * publishable key can only do what row-level security allows.
 *
 * A deploy built without them (for example a preview before the preview
 * database exists) still builds. Every page then says plainly that no
 * database is connected, instead of crashing.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
