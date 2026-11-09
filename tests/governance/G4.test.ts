/**
 * G4 — No owner can touch the other's account: no password reset, email change, 2FA change, session revocation, or impersonation.
 *
 * Every account action in Supabase Auth either acts on the caller's own token
 * or needs the secret key, and the app never holds the secret key. These
 * tests prove both halves against the real auth server: the self-service calls
 * cannot be aimed at the other owner, and the admin endpoints refuse an
 * owner's token.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { afterEach, expect, it } from "vitest";
import {
  adminCallWithUserToken,
  db,
  describeDb,
  makeOwners,
  resetOwners,
  signInAgain,
  verifyTotp,
} from "../helpers/stack";

const FORBIDDEN = [401, 403];

async function verifiedFactors(userId: string): Promise<number> {
  const sql = db();
  try {
    const [row] = await sql`
      select count(*)::int as count from auth.mfa_factors
       where user_id = ${userId} and status = 'verified'`;
    return row?.count;
  } finally {
    await sql.end();
  }
}

describeDb(
  "G4: No owner can touch the other's account: no password reset, email change, 2FA change, session revocation, or impersonation",
  () => {
    afterEach(resetOwners);

    it("G4_owner_cannot_reset_the_other_owners_password", async () => {
      const { gunner, kaden } = await makeOwners();

      const status = await adminCallWithUserToken(gunner.client, "PUT", `/admin/users/${kaden.id}`, {
        password: "taken-over-password-123",
      });
      expect(FORBIDDEN).toContain(status);

      // Changing "my" password only ever changes the caller's.
      const own = await gunner.client.auth.updateUser({ password: "gunners-new-password-123" });
      expect(own.error).toBeNull();

      // Kaden's old password still works.
      await expect(signInAgain(kaden)).resolves.toBeDefined();
    });

    it("G4_owner_cannot_change_the_other_owners_email", async () => {
      const { gunner, kaden } = await makeOwners();

      const status = await adminCallWithUserToken(gunner.client, "PUT", `/admin/users/${kaden.id}`, {
        email: "attacker@waterloo-test.example.com",
        email_confirm: true,
      });
      expect(FORBIDDEN).toContain(status);

      const sql = db();
      try {
        const [row] = await sql`select email from auth.users where id = ${kaden.id}`;
        expect(row?.email).toBe(kaden.email);
      } finally {
        await sql.end();
      }
    });

    it("G4_owner_cannot_remove_the_other_owners_2fa_factor", async () => {
      const { gunner, kaden } = await makeOwners();

      // The self-service call, aimed at Kaden's factor.
      await gunner.client.auth.mfa.unenroll({ factorId: kaden.factorId! });
      // The admin endpoint, with Gunner's token.
      const status = await adminCallWithUserToken(
        gunner.client,
        "DELETE",
        `/admin/users/${kaden.id}/factors/${kaden.factorId}`,
      );
      expect(FORBIDDEN).toContain(status);

      expect(await verifiedFactors(kaden.id)).toBe(1);
    });

    it("G4_owner_cannot_revoke_the_other_owners_sessions", async () => {
      const { gunner, kaden } = await makeOwners();

      // "Sign out everywhere" signs out the caller everywhere, nobody else.
      await gunner.client.auth.signOut({ scope: "global" });
      const status = await adminCallWithUserToken(kaden.client, "GET", "/admin/users");
      expect(FORBIDDEN).toContain(status);

      // Kaden's session still works and still reaches data.
      const { data, error } = await kaden.client.from("workspace_members").select("user_id");
      expect(error).toBeNull();
      expect(data).toHaveLength(2);

      // Signed-in users cannot touch the session tables at all.
      const sql = db();
      try {
        const [row] = await sql`
          select has_table_privilege('authenticated', 'auth.sessions', 'DELETE') as sessions,
                 has_table_privilege('authenticated', 'auth.refresh_tokens', 'DELETE') as tokens`;
        expect(row).toEqual({ sessions: false, tokens: false });
      } finally {
        await sql.end();
      }
    });

    it("G4_owner_cannot_impersonate_the_other_owner", async () => {
      const { gunner, kaden } = await makeOwners();

      // A sign-in link for Kaden's account, minted with Gunner's token.
      const link = await adminCallWithUserToken(gunner.client, "POST", "/admin/generate_link", {
        type: "magiclink",
        email: kaden.email,
      });
      expect(FORBIDDEN).toContain(link);

      // Nobody signed in can read the tables that hold logins and sessions.
      const sql = db();
      try {
        const [row] = await sql`
          select has_table_privilege('authenticated', 'auth.users', 'SELECT') as users,
                 has_table_privilege('authenticated', 'auth.sessions', 'SELECT') as sessions,
                 has_table_privilege('authenticated', 'auth.mfa_factors', 'SELECT') as factors`;
        expect(row).toEqual({ users: false, sessions: false, factors: false });
      } finally {
        await sql.end();
      }
    });

    it("G4_recovery_code_redemption_only_acts_on_the_callers_own_account", async () => {
      const { gunner, kaden } = await makeOwners();

      const { data: kadensCodes, error } = await kaden.client.rpc("generate_recovery_codes");
      expect(error).toBeNull();
      expect(kadensCodes).toHaveLength(10);

      // Gunner holds one of Kaden's codes. It does nothing to Kaden.
      const tried = await gunner.client.rpc("redeem_recovery_code", { code: kadensCodes![0] });
      expect(tried.data).toBe(false);
      expect(await verifiedFactors(kaden.id)).toBe(1);
      expect(await verifiedFactors(gunner.id)).toBe(1);

      // Kaden's code still works for Kaden, and only removes Kaden's 2FA.
      const passwordOnly = await signInAgain(kaden);
      const redeemed = await passwordOnly.rpc("redeem_recovery_code", { code: kadensCodes![0] });
      expect(redeemed.data).toBe(true);
      expect(await verifiedFactors(kaden.id)).toBe(0);
      expect(await verifiedFactors(gunner.id)).toBe(1);
    });

    it("G4_every_function_a_signed_in_user_can_call_is_reviewed", async () => {
      // A new SECURITY DEFINER function that took a user id could reach the
      // other owner's account. So the full list of functions signed-in users
      // can run is pinned here, and changing it means changing this test,
      // which the other owner reviews. Each one acts on auth.uid() only.
      const sql = db();
      try {
        const rows = await sql`
          select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as fn,
                 p.prosecdef as definer
            from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and has_function_privilege('authenticated', p.oid, 'EXECUTE')
           order by 1`;
        expect(rows.map((r) => `${r.fn}${r.definer ? " [definer]" : ""}`)).toEqual([
          "generate_recovery_codes() [definer]",
          "has_fresh_2fa(within_seconds integer)",
          "is_owner() [definer]",
          "recovery_codes_remaining() [definer]",
          "redeem_recovery_code(code text) [definer]",
          "session_is_trusted() [definer]",
          "sign_in_activity() [definer]",
          "waterloo_workspace_id()",
        ]);
      } finally {
        await sql.end();
      }
    });

    it("G4_owners_see_each_others_sign_ins_but_get_no_handle_to_end_them", async () => {
      const { gunner, kaden } = await makeOwners();
      await verifyTotp(kaden);

      const { data, error } = await gunner.client.rpc("sign_in_activity");
      expect(error).toBeNull();
      const people = new Set(data!.map((r: { user_id: string }) => r.user_id));
      expect(people).toEqual(new Set([gunner.id, kaden.id]));
      // No session ids are handed out, so there is nothing to revoke with.
      expect(Object.keys(data![0])).not.toContain("id");
      expect(Object.keys(data![0])).not.toContain("session_id");
    });
  },
);
