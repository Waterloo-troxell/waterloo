/**
 * G3 — Protected actions run only after both owners approve.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G3: Protected actions run only after both owners approve", () => {
  it.todo("G3_protected_action_does_not_run_on_one_approval");
  it.todo("G3_protected_action_runs_after_both_approvals");
  it.todo("G3_owner_cannot_approve_their_own_request");
  it.todo("G3_a_bot_can_neither_request_nor_approve_a_protected_action");
});
