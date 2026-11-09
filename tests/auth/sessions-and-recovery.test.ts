/**
 * M1 behaviour that sits under the G-requirements: the 30-day sign-in limit,
 * the fresh-2FA check M2's approvals will use, and the rules recovery codes
 * follow (single use, 5 wrong guesses an hour, 2FA needed to make them).
 */
import { afterEach, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  apiUrl,
  db,
  describeDb,
  makeOwners,
  publishableKey,
  resetOwners,
  signInAgain,
} from "../helpers/stack";

describeDb("Sessions", () => {
  afterEach(resetOwners);

  it("a sign-in older than 30 days sees nothing, even with 2FA", async () => {
    const { gunner } = await makeOwners();
    const before = await gunner.client.from("workspace_members").select("user_id");
    expect(before.data).toHaveLength(2);

    const sql = db();
    try {
      await sql`update auth.sessions set created_at = now() - interval '31 days'
                 where user_id = ${gunner.id}`;
    } finally {
      await sql.end();
    }
    const after = await gunner.client.from("workspace_members").select("user_id");
    expect(after.data ?? []).toHaveLength(0);
  });

  it("a signed-out session sees nothing, even before its token expires", async () => {
    const { gunner } = await makeOwners();
    const token = (await gunner.client.auth.getSession()).data.session!.access_token;
    await gunner.client.auth.signOut();

    const stale = createClient(apiUrl(), publishableKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await stale.from("workspace_members").select("user_id");
    expect(data ?? []).toHaveLength(0);
  });

  it("the fresh-2FA check passes right after a code and fails outside its window", async () => {
    const { gunner } = await makeOwners();
    const fresh = await gunner.client.rpc("has_fresh_2fa", { within_seconds: 300 });
    expect(fresh.data).toBe(true);
    // A negative window asks "did you enter a code in the future?": always no.
    const never = await gunner.client.rpc("has_fresh_2fa", { within_seconds: -60 });
    expect(never.data).toBe(false);

    const passwordOnly = await signInAgain(gunner);
    const stale = await passwordOnly.rpc("has_fresh_2fa", { within_seconds: 300 });
    expect(stale.data).toBe(false);
  });
});

describeDb("Recovery codes", () => {
  afterEach(resetOwners);

  it("come as 10 distinct codes, are stored only as hashes, and replace any old set", async () => {
    const { gunner } = await makeOwners();
    const first = await gunner.client.rpc("generate_recovery_codes");
    expect(first.error).toBeNull();
    const codes: string[] = first.data;
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);

    const sql = db();
    try {
      const rows = await sql`select code_hash from public.recovery_codes where user_id = ${gunner.id}`;
      expect(rows).toHaveLength(10);
      for (const { code_hash } of rows) {
        expect(code_hash.startsWith("$2")).toBe(true); // bcrypt
        expect(codes.some((c) => code_hash.includes(c))).toBe(false);
      }
    } finally {
      await sql.end();
    }

    await gunner.client.rpc("generate_recovery_codes");
    const remaining = await gunner.client.rpc("recovery_codes_remaining");
    expect(remaining.data).toBe(10);
    const passwordOnly = await signInAgain(gunner);
    const old = await passwordOnly.rpc("redeem_recovery_code", { code: codes[0] });
    expect(old.data).toBe(false);
  });

  it("need 2FA to make, so a leaked password alone cannot mint them", async () => {
    const { gunner } = await makeOwners();
    const passwordOnly = await signInAgain(gunner);
    const { error } = await passwordOnly.rpc("generate_recovery_codes");
    expect(error?.message).toMatch(/2FA/);
  });

  it("work once each, and accept lower case and missing dashes", async () => {
    const { gunner } = await makeOwners();
    const { data: codes } = await gunner.client.rpc("generate_recovery_codes");
    const messy = (codes[3] as string).toLowerCase().replaceAll("-", " ");

    const passwordOnly = await signInAgain(gunner);
    expect((await passwordOnly.rpc("redeem_recovery_code", { code: messy })).data).toBe(true);
    expect((await passwordOnly.rpc("redeem_recovery_code", { code: codes[3] })).data).toBe(false);
  });

  it("allow only 5 wrong guesses an hour", async () => {
    const { gunner } = await makeOwners();
    const { data: codes } = await gunner.client.rpc("generate_recovery_codes");
    const passwordOnly = await signInAgain(gunner);

    for (let i = 0; i < 5; i++) {
      const wrong = await passwordOnly.rpc("redeem_recovery_code", { code: "AAAA-AAAA-AAAA" });
      expect(wrong.data).toBe(false);
    }
    // Even the right code is refused once locked out.
    const locked = await passwordOnly.rpc("redeem_recovery_code", { code: codes[0] });
    expect(locked.error?.message).toMatch(/Too many/);
  });
});

