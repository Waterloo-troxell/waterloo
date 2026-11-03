/**
 * G13 — The charter is a locked document in the workspace. Editing it is a protected action, and both owners sign it in the app with the date logged.
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G13: The charter is a locked document in the workspace", () => {
  it.todo("G13_the_charter_cannot_be_edited_directly");
  it.todo("G13_editing_the_charter_is_a_protected_action");
  it.todo("G13_both_owners_sign_the_charter_in_the_app");
  it.todo("G13_each_signature_records_its_date");
});
