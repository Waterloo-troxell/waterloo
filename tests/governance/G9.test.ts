/**
 * G9 — An owner leaves only when both owners agree, followed by a 14-day cooling-off period either can cancel, and a full export.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G9: An owner leaves only when both owners agree, followed by a 14-day cooling-off period either can cancel, and a full export", () => {
  it.todo("G9_leaving_requires_both_owners_to_agree");
  it.todo("G9_leaving_has_a_14_day_cooling_off_period");
  it.todo("G9_either_owner_can_cancel_during_the_cooling_off_period");
  it.todo("G9_the_leaver_receives_a_full_export_first");
  it.todo("G9_the_leavers_content_stays_after_the_seat_closes");
});
