/**
 * G2 — No owner can remove, demote, suspend, or reduce the other's access through the UI, the API, or the database. Database rules enforce it, not just the interface.
 *
 * Lands in milestone M1. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G2: No owner can remove, demote, suspend, or reduce the other's access through the UI, the API, or the database", () => {
  it.todo("G2_owner_cannot_remove_other_owner");
  it.todo("G2_owner_cannot_demote_other_owner");
  it.todo("G2_owner_cannot_suspend_other_owner");
  it.todo("G2_database_trigger_rejects_direct_delete_of_an_owner");
  it.todo("G2_database_trigger_rejects_direct_update_of_another_owners_row");
});
