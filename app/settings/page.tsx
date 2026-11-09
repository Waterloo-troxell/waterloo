import type { Metadata } from "next";
import { CopyText } from "@/app/_components/copy-text";
import { SignOutButton } from "@/app/_components/sign-out-button";
import { AppShell, Card } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { RegenerateCodes, SignOutOtherDevices } from "./settings-actions";

export const metadata: Metadata = { title: "Settings" };

type Activity = {
  user_id: string;
  display_name: string;
  signed_in_at: string;
  last_active_at: string;
  device: string;
  ip: string | null;
  is_this_device: boolean;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) +
  " UTC";

/** "Mozilla/5.0 (Macintosh; …) … Safari/605" → "Safari on Mac", roughly. */
function deviceName(agent: string): string {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Chrome\//.test(agent)
      ? "Chrome"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Safari\//.test(agent)
          ? "Safari"
          : "A browser";
  const os = /iPhone|iPad/.test(agent)
    ? "iPhone or iPad"
    : /Android/.test(agent)
      ? "Android"
      : /Mac OS X|Macintosh/.test(agent)
        ? "Mac"
        : /Windows/.test(agent)
          ? "Windows"
          : /Linux/.test(agent)
            ? "Linux"
            : "an unknown system";
  return agent === "Unknown device" ? agent : `${browser} on ${os}`;
}

export default async function SettingsPage() {
  const { supabase, userId, email } = await requireStage("ready");
  const db = supabase!;

  const [{ data: me }, { data: factors }, { data: remaining }, { data: activity }] =
    await Promise.all([
      db.from("workspace_members").select("role, display_name").eq("user_id", userId!).maybeSingle(),
      db.auth.mfa.listFactors(),
      db.rpc("recovery_codes_remaining"),
      db.rpc("sign_in_activity"),
    ]);

  const sessions = (activity ?? []) as Activity[];
  const mine = sessions.filter((s) => s.user_id === userId);
  const theirs = sessions.filter((s) => s.user_id !== userId);
  const totp = (factors?.totp ?? []).filter((f) => f.status === "verified");

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-text-muted">
            Your own account only. Nothing here can reach the other owner&apos;s account, and
            nothing on their Settings page can reach yours.
          </p>
        </div>

        <Card title="Your account">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-text-muted">Email</dt>
            <dd>{email}</dd>
            <dt className="text-text-muted">Role</dt>
            <dd>{me?.role === "owner" ? "Owner" : "Not an owner yet (waiting for the bootstrap)"}</dd>
            <dt className="text-text-muted">User ID</dt>
            <dd>
              <CopyText value={userId!} label="your user ID" />
            </dd>
          </dl>
        </Card>

        <Card title="2FA">
          <ul className="space-y-1 text-sm">
            {totp.map((f) => (
              <li key={f.id}>
                {f.friendly_name || "Authenticator app"}{" "}
                <span className="text-text-muted">· added {when(f.created_at)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-muted">
            2FA cannot be turned off. If you lose your phone, sign in with your password and use a
            recovery code to set it up again.
          </p>
        </Card>

        <Card title="Recovery codes">
          <p className="mb-4 text-sm">
            <span className="font-semibold tabular-nums">{remaining ?? 0}</span> of 10 unused.
          </p>
          <RegenerateCodes />
        </Card>

        <Card title="Your devices">
          <SessionList sessions={mine} />
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <SignOutOtherDevices />
            <SignOutButton />
          </div>
        </Card>

        {me?.role === "owner" ? (
          <Card title="The other owner's sign-ins">
            <p className="mb-3 text-sm text-text-muted">
              You can see these, and they can see yours. Neither of you can end the other&apos;s
              sessions.
            </p>
            {theirs.length ? (
              <SessionList sessions={theirs} />
            ) : (
              <p className="text-sm text-text-muted">No active sign-ins.</p>
            )}
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function SessionList({ sessions }: { sessions: Activity[] }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {sessions.map((s) => (
        <li key={`${s.user_id}-${s.signed_in_at}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
          <span className="font-medium">{deviceName(s.device)}</span>
          {s.is_this_device ? (
            <span className="rounded border border-border px-1.5 text-xs text-text-muted">this device</span>
          ) : null}
          <span className="font-mono text-xs text-text-muted sm:ml-auto">
            signed in {when(s.signed_in_at)}
            {s.ip ? ` · ${s.ip}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
