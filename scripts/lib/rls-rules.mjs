/**
 * The rules the row-level-security guard enforces, with no database and no
 * side effects, so they can be unit-tested on their own.
 *
 * A table in `public` is acceptable only when all of these hold:
 *   - row-level security is ENABLED,
 *   - row-level security is FORCED (otherwise the table's owner bypasses
 *     every policy, which would quietly undo the whole guarantee),
 *   - it has at least one policy, or is allowlisted as deliberately sealed,
 *   - it has a `workspace_id` column, or is allowlisted.
 */

export const EMPTY_ALLOWLIST = { noWorkspaceId: new Set(), noPolicies: new Set() };

export function findViolations(tables, allowed = EMPTY_ALLOWLIST) {
  const noWorkspaceId = allowed.noWorkspaceId ?? new Set();
  const noPolicies = allowed.noPolicies ?? new Set();
  const violations = [];

  for (const table of tables) {
    const name = table.table_name;

    if (!table.rls_enabled) {
      violations.push({ table: name, problem: "row-level security is not enabled" });
      // Everything else is moot until RLS is on.
      continue;
    }

    if (!table.rls_forced) {
      violations.push({
        table: name,
        problem:
          "row-level security is enabled but not FORCED, so the table owner bypasses every policy",
      });
    }

    if (table.policy_count === 0 && !noPolicies.has(name)) {
      violations.push({
        table: name,
        problem:
          "row-level security is on but there are no policies, so nobody can read it (add policies, or allowlist it as deliberately sealed)",
      });
    }

    if (!table.has_workspace_id && !noWorkspaceId.has(name)) {
      violations.push({ table: name, problem: "no workspace_id column" });
    }
  }

  return violations;
}
