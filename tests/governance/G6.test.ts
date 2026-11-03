/**
 * G6 — Nothing is permanently deleted without both approvals. Deleted items sit in a trash for 30 days.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G6: Nothing is permanently deleted without both approvals", () => {
  it.todo("G6_permanent_delete_requires_both_approvals");
  it.todo("G6_deleting_moves_an_item_to_the_trash");
  it.todo("G6_either_owner_can_restore_from_the_trash");
  it.todo("G6_purge_is_refused_before_30_days_in_the_trash");
  it.todo("G6_the_trash_never_purges_itself");
});
