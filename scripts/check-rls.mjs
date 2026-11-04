#!/usr/bin/env node
/**
 * The row-level-security guard.
 *
 * Row-level security (RLS) is the Postgres feature that decides, per row,
 * who may read or write it. Waterloo's entire guarantee that neither owner
 * can lock out the other is enforced there, not in the interface. So a
 * single table that ships without it is a hole in the guarantee.
 *
 * This fails the build if any table in `public`:
 *   - does not have RLS enabled,
 *   - has RLS enabled but not FORCED (which would let the table's owner
 *     bypass every policy),
 *   - has RLS enabled but zero policies AND is not deliberately sealed,
 *   - or lacks a `workspace_id` column, per the convention in CLAUDE.md.
 *
 *   npm run check:rls            check the database
 *   npm run check:rls:selftest   prove the guard actually fires
 *
 * Exit codes: 0 clean, 1 violations found, 2 could not check.
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { findViolations } from "./lib/rls-rules.mjs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DEFAULT = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DATABASE_URL = process.env.DATABASE_URL ?? LOCAL_DEFAULT;
const SELFTEST = process.argv.includes("--selftest");
const SELFTEST_TABLE = "__rls_guard_selftest";

function allowlist() {
  try {
    const raw = readFileSync(join(ROOT, "scripts/rls-allowlist.json"), "utf8");
    const parsed = JSON.parse(raw);
    return {
      noWorkspaceId: new Set(parsed.noWorkspaceId ?? []),
      noPolicies: new Set(parsed.noPolicies ?? []),
    };
  } catch {
    return { noWorkspaceId: new Set(), noPolicies: new Set() };
  }
}

const INSPECT = `
  select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policy_count,
    exists (
      select 1 from pg_attribute a
      where a.attrelid = c.oid and a.attname = 'workspace_id' and a.attnum > 0
        and not a.attisdropped
    ) as has_workspace_id
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
  order by c.relname
`;

function report(tables, violations) {
  console.log(`\nChecked ${tables.length} table${tables.length === 1 ? "" : "s"} in "public".\n`);
  for (const t of tables) {
    const bad = violations.some((v) => v.table === t.table_name);
    console.log(
      `  ${bad ? "FAIL" : "ok  "}  ${t.table_name.padEnd(32)} ` +
        `rls=${t.rls_enabled ? "on" : "OFF"} forced=${t.rls_forced ? "yes" : "no"} ` +
        `policies=${t.policy_count} workspace_id=${t.has_workspace_id ? "yes" : "no"}`,
    );
  }
  if (violations.length === 0) {
    console.log("\nEvery table is locked down.\n");
    return;
  }
  console.log(`\n${violations.length} violation${violations.length === 1 ? "" : "s"}:\n`);
  for (const v of violations) console.log(`  - ${v.table}: ${v.problem}`);
  console.log("");
}

async function main() {
  let sql;
  try {
    sql = postgres(DATABASE_URL, { onnotice: () => {}, max: 1, idle_timeout: 5, connect_timeout: 10 });
    await sql`select 1`;
  } catch (error) {
    console.error(
      `\nCould not reach the database at ${DATABASE_URL.replace(/:[^:@]*@/, ":****@")}\n` +
        `\n  ${error.message}\n` +
        `\nStart the local stack first:  npm run db:start\n` +
        `(That needs Docker Desktop running.)\n`,
    );
    process.exit(2);
  }

  try {
    if (SELFTEST) {
      console.log("\nSelf-test: creating a table with no row-level security on purpose.");
      await sql.unsafe(`drop table if exists public.${SELFTEST_TABLE}`);
      await sql.unsafe(`create table public.${SELFTEST_TABLE} (id integer primary key)`);
      const tables = await sql.unsafe(INSPECT);
      const found = findViolations(tables, allowlist()).filter((v) => v.table === SELFTEST_TABLE);
      await sql.unsafe(`drop table public.${SELFTEST_TABLE}`);

      if (found.length === 0) {
        console.error("\nSELF-TEST FAILED: the guard did not notice an unprotected table.\n");
        process.exit(1);
      }
      console.log(`Self-test passed: the guard caught it (${found[0].problem}).`);
      console.log("Cleaned up.\n");
      process.exit(0);
    }

    const tables = await sql.unsafe(INSPECT);
    const violations = findViolations(tables, allowlist());
    report(tables, violations);
    process.exit(violations.length === 0 ? 0 : 1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(`\nThe guard itself failed: ${error.message}\n`);
  process.exit(2);
});
