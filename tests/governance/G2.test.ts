/**
 * G2 — No owner can remove, demote, suspend, or reduce the other's access through the UI, the API, or the database. Database rules enforce it, not just the interface.
 *
 * Each case is tried at every level below the UI: the API with the other
 * owner's own token, Supabase's admin API with the secret key, and raw SQL as
 * the `postgres` role. The UI has no button for any of these, so the levels
 * underneath it are the ones that need proving.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { afterEach, expect, it } from "vitest";
import {
  adminClient,
  browserClient,
  db,
  describeDb,
  makeOwners,
  resetOwners,
} from "../helpers/stack";

async function ownerRow(userId: string) {
  const sql = db();
  try {
    const [row] = await sql`
      select role, status from public.workspace_members where user_id = ${userId}`;
    return row;
  } finally {
    await sql.end();
  }
}

describeDb(
  "G2: No owner can remove, demote, suspend, or reduce the other's access through the UI, the API, or the database",
  () => {
    afterEach(resetOwners);

    it("G2_owner_cannot_remove_other_owner", async () => {
      const { gunner, kaden } = await makeOwners();

      // Through the API, with Gunner's own token.
      await gunner.client.from("workspace_members").delete().eq("user_id", kaden.id);
      expect(await ownerRow(kaden.id)).toEqual({ role: "owner", status: "active" });

      // Deleting Kaden's whole login with the secret key, hard or soft.
      const hard = await adminClient().auth.admin.deleteUser(kaden.id);
      expect(hard.error).not.toBeNull();
      const soft = await adminClient().auth.admin.deleteUser(kaden.id, true);
      expect(soft.error).not.toBeNull();

      // Kaden can still sign in.
      const again = await kaden.client.auth.signInWithPassword({
        email: kaden.email,
        password: kaden.password,
      });
      expect(again.error).toBeNull();
    });

    it("G2_owner_cannot_demote_other_owner", async () => {
      const { gunner, kaden } = await makeOwners();

      const viaApi = await gunner.client
        .from("workspace_members")
        .update({ role: "member" })
        .eq("user_id", kaden.id);
      expect(viaApi.error).not.toBeNull();

      const sql = db();
      try {
        await expect(
          sql`update public.workspace_members set role = 'member' where user_id = ${kaden.id}`,
        ).rejects.toThrow(/demote an owner/);
      } finally {
        await sql.end();
      }
      expect(await ownerRow(kaden.id)).toEqual({ role: "owner", status: "active" });
    });

    it("G2_owner_cannot_suspend_other_owner", async () => {
      const { gunner, kaden } = await makeOwners();

      // There is no "suspended" status to set. "left" needs the governed
      // leave flow.
      const viaApi = await gunner.client
        .from("workspace_members")
        .update({ status: "left" })
        .eq("user_id", kaden.id);
      expect(viaApi.error).not.toBeNull();

      const sql = db();
      try {
        await expect(
          sql`update public.workspace_members set status = 'suspended' where user_id = ${kaden.id}`,
        ).rejects.toThrow();
        await expect(
          sql`update public.workspace_members set status = 'left' where user_id = ${kaden.id}`,
        ).rejects.toThrow(/governed leave flow/);
      } finally {
        await sql.end();
      }

      // Banning Kaden's login with the secret key: refused.
      const ban = await adminClient().auth.admin.updateUserById(kaden.id, {
        ban_duration: "876000h",
      });
      expect(ban.error).not.toBeNull();

      const again = await kaden.client.auth.signInWithPassword({
        email: kaden.email,
        password: kaden.password,
      });
      expect(again.error).toBeNull();
      expect(await ownerRow(kaden.id)).toEqual({ role: "owner", status: "active" });
    });

    it("G2_database_trigger_rejects_direct_delete_of_an_owner", async () => {
      const { kaden } = await makeOwners();
      const sql = db();
      try {
        await expect(
          sql`delete from public.workspace_members where user_id = ${kaden.id}`,
        ).rejects.toThrow(/can never be removed/);
        await expect(sql`truncate public.workspace_members`).rejects.toThrow(/in bulk/);
        await expect(sql`delete from auth.users where id = ${kaden.id}`).rejects.toThrow(
          /foreign key/,
        );
      } finally {
        await sql.end();
      }
      expect(await ownerRow(kaden.id)).toEqual({ role: "owner", status: "active" });
    });

    it("G2_database_trigger_rejects_direct_update_of_another_owners_row", async () => {
      const { gunner, kaden } = await makeOwners();
      const sql = db();
      try {
        // Moving Kaden's seat to someone else.
        await expect(
          sql`update public.workspace_members set user_id = ${gunner.id} where user_id = ${kaden.id}`,
        ).rejects.toThrow(/cannot be moved/);
        // Promoting a non-owner by rewriting a row.
        await expect(
          sql`update public.workspace_members set role = 'owner', status = 'left' where user_id = ${kaden.id}`,
        ).rejects.toThrow();
      } finally {
        await sql.end();
      }
      expect(await ownerRow(kaden.id)).toEqual({ role: "owner", status: "active" });
    });

    it("G2_no_data_comes_back_without_2fa", async () => {
      const { gunner } = await makeOwners();
      // A password-only sign-in, as if the password leaked.
      const passwordOnly = browserClient();
      await passwordOnly.auth.signInWithPassword({
        email: gunner.email,
        password: gunner.password,
      });
      const { data } = await passwordOnly.from("workspace_members").select("user_id");
      expect(data ?? []).toHaveLength(0);
    });
  },
);
