import Link from "next/link";
import { CopyText } from "@/app/_components/copy-text";
import { AppShell, Card, Notice, Wordmark } from "@/app/_components/ui";
import { requireStage } from "@/lib/auth/stage";
import { buildInfo, shortCommit } from "@/lib/build-info";
import { milestones } from "@/lib/milestones";

type Member = { user_id: string; display_name: string; role: string; status: string };

export default async function Home() {
  const { stage, supabase, userId } = await requireStage("ready", "no-database");

  if (stage === "no-database") {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
        <Wordmark />
        <Notice>
          This deploy was built without a database connection, so there is nothing to sign in to
          yet. Production and previews get one from their GitHub secrets.
        </Notice>
        <BuildFooter />
      </main>
    );
  }

  const { data } = await supabase!
    .from("workspace_members")
    .select("user_id, display_name, role, status")
    .order("created_at");
  const owners = ((data ?? []) as Member[]).filter((m) => m.role === "owner");
  const me = owners.find((m) => m.user_id === userId);
  const other = owners.find((m) => m.user_id !== userId);

  return (
    <AppShell>
      <div className="space-y-8">
        {me ? (
          <div>
            <h1 className="text-2xl font-semibold">Welcome back, {me.display_name || "owner"}.</h1>
            <p className="mt-2 text-text-muted">
              You and {other?.display_name || "the other owner"} are Waterloo&apos;s two owners.
              Neither of you can remove, demote or lock out the other.
            </p>
          </div>
        ) : (
          <Card title="Waiting for the owner bootstrap">
            <div className="space-y-3 text-sm">
              <p>
                You are signed in with 2FA, but you are not an owner yet. Both owners are written in
                together, once, by a change you both approve on GitHub.
              </p>
              <p className="text-text-muted">
                When both of you have reached this page, send your user ID to the other owner.
                Before approving that pull request, check that the ID next to your name matches
                this one exactly:
              </p>
              <p className="rounded-md border border-border bg-bg px-3 py-2.5">
                <CopyText value={userId!} label="your user ID" />
              </p>
            </div>
          </Card>
        )}

        <Card title="Build order">
          <ol className="divide-y divide-border">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span
                  className={`font-mono text-xs tabular-nums ${milestone.done ? "text-text" : "text-text-muted"}`}
                >
                  {milestone.id}
                </span>
                <span className={milestone.done ? "font-medium" : "text-text-muted"}>
                  {milestone.name}
                </span>
                <span className="ml-auto hidden text-right text-xs text-text-muted sm:block">
                  {milestone.delivers}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <p className="text-sm text-text-muted">
          Your 2FA, recovery codes and devices are in{" "}
          <Link href="/settings" className="text-text underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
        <BuildFooter />
      </div>
    </AppShell>
  );
}

function BuildFooter() {
  const builtAt = buildInfo.builtAt ? new Date(buildInfo.builtAt).toUTCString() : "local build";
  return (
    <footer className="border-t border-border pt-5 font-mono text-xs text-text-muted">
      {shortCommit()} &middot; {buildInfo.context} &middot; {builtAt}
    </footer>
  );
}
