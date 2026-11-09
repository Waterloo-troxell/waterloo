/**
 * G1 — Exactly two owner seats in v1. Only that owner can change their own status.
 *
 * Runs against the real local stack. The owner lock lives in Postgres
 * (supabase/migrations/*_owners_and_auth.sql), so these tests go around the
 * app on purpose: through the API with an owner's own token, and straight
 * into the database as the `postgres` role.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { afterEach, expect, it } from "vitest";
import {
  asUser,
  claimsOf,
  db,
  describeDb,
  enrollTotp,
  makeOwners,
  makeUser,
  resetOwners,
} from "../helpers/stack";

describeDb("G1: Exactly two owner seats in v1", () => {
  afterEach(resetOwners);

  it("G1_exactly_two_owner_seats", async () => {
    const { gunner, kaden } = await makeOwners();

    const { data, error } = await gunner.client
      .from("workspace_members")
      .select("user_id, role, status");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data!.every((m) => m.role === "owner" && m.status === "active")).toBe(true);
    expect(data!.map((m) => m.user_id).sort()).toEqual([gunner.id, kaden.id].sort());
  });

  it("G1_a_third_owner_cannot_be_inserted", async () => {
    const { gunner } = await makeOwners();
    const third = await enrollTotp(await makeUser("third"));
    const sql = db();
    try {
      // Through the bootstrap a second time.
      await expect(
        sql`select public.bootstrap_owners(${third.id}, 'Third', ${gunner.id}, 'Gunner')`,
      ).rejects.toThrow(/already set/);

      // Straight into the table, even pretending to be the bootstrap.
      await expect(
        sql.begin(async (tx) => {
          await tx`select set_config('waterloo.bootstrapping_owners', 'on', true)`;
          await tx`insert into public.workspace_members (user_id, role) values (${third.id}, 'owner')`;
        }),
      ).rejects.toThrow(/exactly two owner seats/);
    } finally {
      await sql.end();
    }

    // Through the API, with an owner's own token.
    const viaApi = await gunner.client
      .from("workspace_members")
      .insert({ user_id: third.id, role: "owner" });
    expect(viaApi.error).not.toBeNull();

    const { data } = await gunner.client.from("workspace_members").select("user_id");
    expect(data).toHaveLength(2);
  });

  it("G1_owner_can_change_only_their_own_status", async () => {
    const { gunner, kaden } = await makeOwners();

    // Your own profile: allowed.
    const own = await gunner.client
      .from("workspace_members")
      .update({ display_name: "Gunner T." })
      .eq("user_id", gunner.id)
      .select();
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    // The other owner's profile, through the API: nothing changes.
    const other = await gunner.client
      .from("workspace_members")
      .update({ display_name: "Not Kaden" })
      .eq("user_id", kaden.id)
      .select();
    expect(other.data ?? []).toHaveLength(0);

    // The other owner's status, through the API: refused outright.
    const status = await gunner.client
      .from("workspace_members")
      .update({ status: "left" })
      .eq("user_id", kaden.id);
    expect(status.error).not.toBeNull();

    // The other owner's row, even with every policy bypassed: the trigger
    // still knows who is asking.
    const claims = await claimsOf(gunner.client);
    const sql = db();
    try {
      await expect(
        sql.begin(async (tx) => {
          await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
          await tx`update public.workspace_members set display_name = 'Not Kaden' where user_id = ${kaden.id}`;
        }),
      ).rejects.toThrow(/only your own membership/);

      // Even your own status changes only through the governed leave flow,
      // which needs both owners (G9, M2).
      await expect(
        asUser(claims, (tx) =>
          tx`update public.workspace_members set status = 'left' where user_id = ${gunner.id}`,
        ),
      ).rejects.toThrow();

      const [row] = await sql`select display_name, status from public.workspace_members where user_id = ${kaden.id}`;
      expect(row).toEqual({ display_name: "Kaden", status: "active" });
    } finally {
      await sql.end();
    }
  });

  it("G1_bootstrap_refuses_the_same_person_twice_and_anyone_without_2fa", async () => {
    const withTotp = await enrollTotp(await makeUser("with2fa"));
    const noTotp = await makeUser("no2fa");
    const sql = db();
    try {
      await expect(
        sql`select public.bootstrap_owners(${withTotp.id}, 'A', ${withTotp.id}, 'A again')`,
      ).rejects.toThrow(/two different people/);
      await expect(
        sql`select public.bootstrap_owners(${withTotp.id}, 'A', ${noTotp.id}, 'B')`,
      ).rejects.toThrow(/has not turned on 2FA/);
      const [row] = await sql`select count(*)::int as count from public.workspace_members`;
      expect(row?.count).toBe(0);
    } finally {
      await sql.end();
    }

    // A signed-in user cannot call the bootstrap at all.
    const { error } = await withTotp.client.rpc("bootstrap_owners", {
      first_owner: withTotp.id,
      first_name: "A",
      second_owner: noTotp.id,
      second_name: "B",
    });
    expect(error).not.toBeNull();
  });
});
