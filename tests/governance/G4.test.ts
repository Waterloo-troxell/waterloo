/**
 * G4 — No owner can touch the other's account: no password reset, email change, 2FA change, session revocation, or impersonation.
 *
 * Lands in milestone M1. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G4: No owner can touch the other's account: no password reset, email change, 2FA change, session revocation, or impersonation", () => {
  it.todo("G4_owner_cannot_reset_the_other_owners_password");
  it.todo("G4_owner_cannot_change_the_other_owners_email");
  it.todo("G4_owner_cannot_remove_the_other_owners_2fa_factor");
  it.todo("G4_owner_cannot_revoke_the_other_owners_sessions");
  it.todo("G4_owner_cannot_impersonate_the_other_owner");
  it.todo("G4_recovery_code_redemption_only_acts_on_the_callers_own_account");
});
