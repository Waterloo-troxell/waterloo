# Waterloo

Waterloo is the private, internal workspace of two co-owners, Gunner and Kaden, who run a small freelance coding business. Exactly two people use it. It is not a product and will not have outside users in v1.

**Before planning or starting any milestone, read `docs/WATERLOO_V1_BRIEF.md`.** It holds the full v1 scope, permission tiers, module acceptance criteria, infrastructure constraints, design tokens, and build order. This file holds the rules that apply in every session.

## The one rule

Both owners have full, permanent access to everything. Neither owner can remove, demote, lock out, or reduce the access of the other: not through the UI, not through the API, not through the database. Every decision serves this rule. If a task would weaken it, stop and explain instead of building it.

## Who you're working with

- Gunner and Kaden don't read code yet. You write all of it.
- Explain in plain English: what changed, what they can now do, how to test it. Define any technical term in one line the first time you use it.
- They approve work by testing behavior on a preview deploy, not by reading diffs. Make that easy and specific.
- They work by the scientific method: every module ships as a hypothesis ("we'll use this daily"), gets used for a week, then gets kept, changed, or cut.

## Requirements (each needs an automated test before v1 ships)

| ID | Requirement |
|----|-------------|
| G1 | Exactly two owner seats in v1. Only that owner can change their own status. |
| G2 | No owner can remove, demote, suspend, or reduce the other's access through the UI, the API, or the database. Database rules enforce it, not just the interface. |
| G3 | Protected actions run only after both owners approve. |
| G4 | No owner can touch the other's account: no password reset, email change, 2FA change, session revocation, or impersonation. |
| G5 | Either owner can export all workspace data at any time, with no approval. |
| G6 | Nothing is permanently deleted without both approvals. Deleted items sit in a trash for 30 days. |
| G7 | Every action lands in an append-only audit log both owners can read and neither can edit or delete. |
| G8 | Every governance or security event emails both owners (and also notifies them in-app and by push). |
| G9 | An owner leaves only when both owners agree, followed by a 14-day cooling-off period either can cancel, and a full export. |
| G10 | Governance rules can't be changed inside the app. Changing them takes a code change the other owner approves. |
| G11 | Every protected action waits 24 hours after both owners approve, and either owner can cancel it during the wait. |
| G12 | Every protected request has an optional reason field, and any reason given is saved in the decision log. |
| G13 | The charter is a locked document in the workspace. Editing it is a protected action, and both owners sign it in the app with the date logged. |

Name each test after its requirement, for example `G2_owner_cannot_remove_other_owner`.

## Hard constraints

- **Budget is $0.** Free tiers only. Never add a paid service, a plan upgrade, or anything that needs a card without asking both owners first.
- **No custom domain.** The app lives at a free `*.netlify.app` address, and no email can come from a domain of our own.
- **Stack:** Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres, Auth, Realtime), hosted on Netlify, installable as a PWA. Don't swap stack pieces without asking.
- **Governance lives in Postgres:** row-level security on every table, triggers that reject forbidden changes, and security-definer functions for governed operations. The UI only mirrors these rules.
- **The Supabase service-role key** is for migrations and backup jobs only. It never reaches the browser and never runs on a user's behalf.
- **Secrets** never go in the repo. They live in GitHub Actions secrets, Netlify environment variables, and the owners' shared Bitwarden vault.
- **Deploys go through GitHub Actions and the Netlify CLI**, never Netlify's Git integration (the brief explains why).

## How to work

1. One milestone at a time, in the brief's order. Milestones 1 to 3 (owners, governance, export and backups) are never cut; features can be.
2. Before writing code for a milestone, post a short plain-English plan: what the owners will be able to do when it's done, and how they'll test it. Wait for a "go".
3. Work on a branch. Never push to `main`, and never disable or bypass branch protection.
4. Every pull request description includes:
   - What changed, in plain English (five bullets at most)
   - Which G-requirements it touches
   - How to test on the preview: a click-by-click checklist
   - A summary of test results
   - Risks, and how to roll back
5. A pull request merges only after the other owner approves it on GitHub with CI green. Never merge your own work.
6. Database changes are migration files in `supabase/migrations`, approved like any other change. Never change the remote database by hand.
7. When the brief is silent or a choice costs money or weakens a G-requirement, ask instead of guessing.

## Conventions

- Every table has `workspace_id`, RLS enabled, and deny-by-default policies. CI fails if any table in `public` lacks RLS.
- Money is stored in integer cents (USD). Timestamps are `timestamptz` in UTC.
- Anything a user can delete is soft-deleted (`deleted_at`). Permanent purges go only through the governance engine.
- Every meaningful write emits an audit event.
- SQL and RLS tests run against a local Supabase stack in CI, alongside lint, type check, and unit tests. No merging on red.
- Prefer boring, well-documented libraries, and explain any new dependency in the pull request.

## Commands

Fill these in as the project is scaffolded: dev server, local Supabase start and reset, tests, lint, type check, new migration, and deploy.
