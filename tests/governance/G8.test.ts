/**
 * G8 — Every governance or security event emails both owners (and also notifies them in-app and by push).
 *
 * Lands in milestone M2. Until then every case below is a `todo`, which
 * `npm test` prints as an unfinished line. That list is the scoreboard: a
 * requirement cannot be quietly forgotten, because it is already named here.
 *
 * Source: CLAUDE.md, "Requirements".
 */
import { describe, it } from "vitest";

describe("G8: Every governance or security event emails both owners (and also notifies them in-app and by push)", () => {
  it.todo("G8_governance_event_notifies_both_owners_in_app");
  it.todo("G8_governance_event_queues_email_to_both_owners");
  it.todo("G8_security_alerts_cannot_be_turned_off");
  it.todo("G8_a_failed_email_send_raises_a_banner_for_both_owners");
});
