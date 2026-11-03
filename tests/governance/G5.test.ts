/**
 * G5 — Either owner can export all workspace data at any time, with no approval.
 *
 * Lands in milestone M3. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G5: Either owner can export all workspace data at any time, with no approval", () => {
  it.todo("G5_either_owner_can_export_without_approval");
  it.todo("G5_export_contains_every_table");
  it.todo("G5_export_notifies_the_other_owner");
});
