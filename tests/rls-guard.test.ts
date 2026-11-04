import { describe, expect, it } from "vitest";
// The guard's rules are pure, so they can be tested without a database.
import { findViolations } from "../scripts/lib/rls-rules.mjs";

type TableRow = {
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  policy_count: number;
  has_workspace_id: boolean;
};

const lockedDown = (name: string): TableRow => ({
  table_name: name,
  rls_enabled: true,
  rls_forced: true,
  policy_count: 2,
  has_workspace_id: true,
});

describe("the row-level-security guard", () => {
  it("passes a table that is fully locked down", () => {
    expect(findViolations([lockedDown("tasks")])).toEqual([]);
  });

  it("passes when there are no tables at all", () => {
    expect(findViolations([])).toEqual([]);
  });

  // This is the case the guard exists for. If this test ever goes green
  // by accident, the guard has stopped guarding anything.
  it("catches a table with row-level security switched off", () => {
    const violations = findViolations([{ ...lockedDown("leaky"), rls_enabled: false }]);
    expect(violations).toHaveLength(1);
    expect(violations[0]!.table).toBe("leaky");
    expect(violations[0]!.problem).toMatch(/not enabled/);
  });

  it("catches row-level security that is enabled but not forced", () => {
    const violations = findViolations([{ ...lockedDown("soft"), rls_forced: false }]);
    expect(violations.map((v) => v.problem)).toContainEqual(
      expect.stringMatching(/not FORCED/),
    );
  });

  it("catches a table with no policies", () => {
    const violations = findViolations([{ ...lockedDown("sealed"), policy_count: 0 }]);
    expect(violations.map((v) => v.problem)).toContainEqual(
      expect.stringMatching(/no policies/),
    );
  });

  it("catches a missing workspace_id column", () => {
    const violations = findViolations([{ ...lockedDown("orphan"), has_workspace_id: false }]);
    expect(violations).toEqual([{ table: "orphan", problem: "no workspace_id column" }]);
  });

  it("reports every problem a single table has", () => {
    const violations = findViolations([
      { ...lockedDown("bad"), rls_forced: false, policy_count: 0, has_workspace_id: false },
    ]);
    expect(violations).toHaveLength(3);
  });

  it("honours the allowlist, but only for the named table", () => {
    const rows = [
      { ...lockedDown("migrations"), has_workspace_id: false },
      { ...lockedDown("other"), has_workspace_id: false },
    ];
    const violations = findViolations(rows, {
      noWorkspaceId: new Set(["migrations"]),
      noPolicies: new Set(),
    });
    expect(violations).toEqual([{ table: "other", problem: "no workspace_id column" }]);
  });

  it("never lets an allowlist excuse row-level security itself", () => {
    const violations = findViolations([{ ...lockedDown("sneaky"), rls_enabled: false }], {
      noWorkspaceId: new Set(["sneaky"]),
      noPolicies: new Set(["sneaky"]),
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.problem).toMatch(/not enabled/);
  });
});
