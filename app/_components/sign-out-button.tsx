"use client";

import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";

/** Signs out this device only. */
export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="underline underline-offset-4 hover:text-text"
      onClick={async () => {
        await browserSupabase().auth.signOut({ scope: "local" });
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
