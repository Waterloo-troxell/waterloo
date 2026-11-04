/**
 * G1 — Exactly two owner seats in v1. Only that owner can change their own status.
 *
 * Lands in milestone M1. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G1: Exactly two owner seats in v1", () => {
  it.todo("G1_exactly_two_owner_seats");
  it.todo("G1_a_third_owner_cannot_be_inserted");
  it.todo("G1_owner_can_change_only_their_own_status");
});
