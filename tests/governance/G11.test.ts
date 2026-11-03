/**
 * G11 — Every protected action waits 24 hours after both owners approve, and either owner can cancel it during the wait.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G11: Every protected action waits 24 hours after both owners approve, and either owner can cancel it during the wait", () => {
  it.todo("G11_protected_action_waits_24_hours_after_both_approvals");
  it.todo("G11_either_owner_can_cancel_during_the_wait");
  it.todo("G11_a_cancelled_action_never_runs");
  it.todo("G11_an_owner_leaving_waits_14_days_not_24_hours");
});
