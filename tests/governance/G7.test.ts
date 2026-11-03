/**
 * G7 — Every action lands in an append-only audit log both owners can read and neither can edit or delete.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G7: Every action lands in an append-only audit log both owners can read and neither can edit or delete", () => {
  it.todo("G7_every_meaningful_write_emits_an_audit_event");
  it.todo("G7_audit_log_rejects_updates");
  it.todo("G7_audit_log_rejects_deletes");
  it.todo("G7_both_owners_can_read_the_whole_audit_log");
  it.todo("G7_hash_chain_detects_a_tampered_row");
});
