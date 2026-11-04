/**
 * G10 — Governance rules can't be changed inside the app. Changing them takes a code change the other owner approves.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G10: Governance rules can't be changed inside the app", () => {
  it.todo("G10_no_in_app_path_can_change_a_waiting_period");
  it.todo("G10_no_in_app_path_can_change_who_must_approve");
  it.todo("G10_governance_configuration_is_not_writable_by_any_app_role");
});
