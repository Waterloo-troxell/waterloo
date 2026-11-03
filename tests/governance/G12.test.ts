/**
 * G12 — Every protected request has an optional reason field, and any reason given is saved in the decision log.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G12: Every protected request has an optional reason field, and any reason given is saved in the decision log", () => {
  it.todo("G12_a_request_can_be_created_without_a_reason");
  it.todo("G12_a_reason_that_is_given_is_saved_in_the_decision_log");
  it.todo("G12_a_saved_reason_cannot_be_edited_after_both_approvals");
});
