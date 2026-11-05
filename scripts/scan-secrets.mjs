#!/usr/bin/env node
/**
 * Refuses to let a secret into the history.
 *
 * The repository is public, so a leaked key is a live incident, not a
 * tidiness problem. This scans every file git is tracking and fails on
 * anything that looks like a credential. It runs in CI on every pull
 * request and can be run by hand:
 *
 *   npm run check:secrets
 *
 * Exit codes: 0 clean, 1 something that looks like a secret.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const PATTERNS = [
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "age secret key", re: /AGE-SECRET-KEY-1[0-9A-Z]{20,}/ },
  { name: "GitHub token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/ },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { name: "JSON Web Token (may be a Supabase key)", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: "Supabase publishable/secret key", re: /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "Google OAuth client secret", re: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/ },
  { name: "filled-in secret environment variable", re: /^\s*(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|NETLIFY_AUTH_TOKEN|NETLIFY_SITE_ID|SMTP_PASSWORD|GMAIL_APP_PASSWORD|DATABASE_PASSWORD)\s*=\s*\S+/m },
];

/** Files whose whole job is to show the shape of a secret without being one. */
const EXEMPT = new Set(["scripts/scan-secrets.mjs", ".env.example"]);

const BINARY = /\.(png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|pdf|zip|gz|age)$/i;
const MAX_BYTES = 2_000_000;

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return out.split("\0").filter(Boolean);
}

const findings = [];
let scanned = 0;

for (const file of trackedFiles()) {
  if (EXEMPT.has(file) || BINARY.test(file)) continue;
  let size;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > MAX_BYTES) continue;

  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\0")) continue;
  scanned++;

  for (const { name, re } of PATTERNS) {
    const match = re.exec(text);
    if (!match) continue;
    const line = text.slice(0, match.index).split("\n").length;
    findings.push({ file, line, name });
  }
}

console.log(`\nScanned ${scanned} tracked text file${scanned === 1 ? "" : "s"} for credentials.`);

if (findings.length === 0) {
  console.log("Nothing that looks like a secret.\n");
  process.exit(0);
}

console.error(`\n${findings.length} possible secret${findings.length === 1 ? "" : "s"}:\n`);
for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.name}`);
console.error(
  "\nIf one of these is a real credential: rotate it now, then remove it from the\n" +
    "history. Secrets belong in GitHub Actions secrets, Netlify environment\n" +
    "variables, and the shared Bitwarden vault — never in the repository.\n",
);
process.exit(1);
