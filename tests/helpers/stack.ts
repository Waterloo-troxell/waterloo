/**
 * Shared plumbing for tests that run against the real local Supabase stack
 * (`npm run db:start`): real Postgres, real Supabase Auth, real 2FA codes.
 * Nothing here is a mock, because a mocked guarantee is not a guarantee.
 *
 * Set WATERLOO_SKIP_DB=1 to skip these suites when no stack is running. CI
 * does that only in the job with no database. The database job runs them for
 * real, and it is a required check, so they cannot be skipped into a merge.
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as OTPAuth from "otpauth";
import postgres from "postgres";
import { describe } from "vitest";

export const skipDb = process.env.WATERLOO_SKIP_DB === "1";

/** `describe`, or `describe.skip` when there is deliberately no database. */
export const describeDb = skipDb ? describe.skip : describe;

type StackInfo = { apiUrl: string; dbUrl: string; publishableKey: string; secretKey: string };

let cached: StackInfo | undefined;

function stack(): StackInfo {
  if (cached) return cached;
  let raw: string;
  try {
    raw = execSync("npx supabase status -o json", {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch {
    throw new Error(
      "The local Supabase stack is not running. Start it with `npm run db:start` " +
        "(Docker Desktop must be open), or set WATERLOO_SKIP_DB=1 to skip database tests.",
    );
  }
  // The CLI can print a notice before the JSON.
  const status = JSON.parse(raw.slice(raw.indexOf("{")));
  cached = {
    apiUrl: status.API_URL,
    dbUrl: status.DB_URL,
    publishableKey: status.PUBLISHABLE_KEY,
    secretKey: status.SECRET_KEY,
  };
  return cached;
}

/** Postgres as the `postgres` role: what a migration, or a determined person
 * with the database password, could do. Triggers still apply to it. */
export function db() {
  return postgres(stack().dbUrl, { max: 2, onnotice: () => {} });
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

/** A browser-equivalent client: the publishable key, no session yet. */
export function browserClient(): SupabaseClient {
  return createClient(stack().apiUrl, stack().publishableKey, clientOptions);
}

/** The secret key. Tests use it only to set up accounts, or to prove that
 * even it cannot do something. The app never holds it. */
export function adminClient(): SupabaseClient {
  return createClient(stack().apiUrl, stack().secretKey, clientOptions);
}

export function apiUrl(): string {
  return stack().apiUrl;
}

export function publishableKey(): string {
  return stack().publishableKey;
}

export type TestUser = {
  label: string;
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
  factorId?: string;
  totp?: OTPAuth.TOTP;
};

const TEST_DOMAIN = "waterloo-test.example.com";

/** Sign up a confirmed user and sign them in. They are at aal1 (password only). */
export async function makeUser(label: string): Promise<TestUser> {
  const email = `${label}-${randomUUID().slice(0, 8)}@${TEST_DOMAIN}`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");

  const client = browserClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { label, id: data.user.id, email, password, client };
}

/** Turn on 2FA for a user and verify it, leaving their session at aal2. */
export async function enrollTotp(user: TestUser): Promise<TestUser> {
  const enroll = await user.client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `${user.label} phone`,
  });
  if (enroll.error) throw enroll.error;
  user.factorId = enroll.data.id;
  user.totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(enroll.data.totp.secret) });
  await verifyTotp(user);
  return user;
}

/** Enter a 2FA code on the user's current session. */
export async function verifyTotp(user: TestUser): Promise<void> {
  if (!user.factorId || !user.totp) throw new Error(`${user.label} has no 2FA factor`);
  const challenge = await user.client.auth.mfa.challenge({ factorId: user.factorId });
  if (challenge.error) throw challenge.error;
  const verify = await user.client.auth.mfa.verify({
    factorId: user.factorId,
    challengeId: challenge.data.id,
    code: user.totp.generate(),
  });
  if (verify.error) throw verify.error;
}

/** A fresh, password-only session for an existing user (aal1). */
export async function signInAgain(user: TestUser): Promise<SupabaseClient> {
  const client = browserClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
  return client;
}

export async function accessToken(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("no session");
  return data.session.access_token;
}

/** Two users with 2FA, written in as the owners by the real bootstrap. */
export async function makeOwners(): Promise<{ gunner: TestUser; kaden: TestUser }> {
  const gunner = await enrollTotp(await makeUser("gunner"));
  const kaden = await enrollTotp(await makeUser("kaden"));
  const sql = db();
  try {
    await sql`select public.bootstrap_owners(${gunner.id}, 'Gunner', ${kaden.id}, 'Kaden')`;
  } finally {
    await sql.end();
  }
  return { gunner, kaden };
}

/**
 * Wipe every test account and owner row so the next test starts clean.
 *
 * The owner lock refuses this, as it should, so the reset switches the lock's
 * trigger off for a moment. Only the table's owner (the `postgres` role) can
 * do that, which is exactly the point: getting around the lock takes a
 * reviewed migration, never an app request.
 */
export async function resetOwners(): Promise<void> {
  const sql = db();
  try {
    await sql.begin(async (tx) => {
      await tx`alter table public.workspace_members disable trigger workspace_members_owner_lock`;
      await tx`delete from public.workspace_members`;
      await tx`alter table public.workspace_members enable trigger workspace_members_owner_lock`;
      await tx`delete from auth.users where email like ${"%@" + TEST_DOMAIN}`;
    });
  } finally {
    await sql.end();
  }
}

/** Run SQL as a signed-in user would reach the database through the API:
 * the `authenticated` role, with that user's token claims. */
export async function asUser<T>(
  claims: Record<string, unknown>,
  run: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  const sql = db();
  try {
    return (await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      await tx`set local role authenticated`;
      return run(tx);
    })) as T;
  } finally {
    await sql.end();
  }
}

/** The claims inside a user's current access token. */
export async function claimsOf(client: SupabaseClient): Promise<Record<string, unknown>> {
  const token = await accessToken(client);
  return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
}

/** Call a Supabase Auth admin endpoint holding only a user's own token. */
export async function adminCallWithUserToken(
  client: SupabaseClient,
  method: string,
  path: string,
  body?: unknown,
): Promise<number> {
  const token = await accessToken(client);
  const res = await fetch(`${apiUrl()}/auth/v1${path}`, {
    method,
    headers: {
      apikey: publishableKey(),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.status;
}
