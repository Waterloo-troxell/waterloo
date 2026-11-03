/**
 * The build order from docs/WATERLOO_V1_BRIEF.md §10. The home page shows
 * this so both owners can see, without reading code, how far along the app
 * actually is. Flip `done` as each milestone is accepted.
 */
export type Milestone = {
  id: string;
  name: string;
  delivers: string;
  done: boolean;
};

export const milestones: readonly Milestone[] = [
  { id: "M0", name: "Setup", delivers: "Repository, checks, and deploys", done: true },
  { id: "M1", name: "Owners and auth", delivers: "Sign-in, 2FA, the owner lock", done: false },
  { id: "M2", name: "Governance core", delivers: "Approvals, audit log, the charter", done: false },
  { id: "M3", name: "Export and backups", delivers: "One-click export, nightly backups", done: false },
  { id: "M4", name: "Daily work", delivers: "Home, projects, tasks, docs", done: false },
  { id: "M5", name: "Business", delivers: "Leads, ledger, ideas, search", done: false },
  { id: "M6", name: "Use week", delivers: "A week of daily use, then freeze", done: false },
] as const;
