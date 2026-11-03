import { buildInfo, shortCommit } from "@/lib/build-info";
import { milestones } from "@/lib/milestones";

export default function Home() {
  const builtAt = buildInfo.builtAt
    ? new Date(buildInfo.builtAt).toUTCString()
    : "not recorded (local build)";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16 sm:px-8">
      <header className="border-b border-border pb-8">
        <h1 className="font-display text-5xl leading-none font-light tracking-[0.15em] uppercase sm:text-6xl">
          Waterloo
        </h1>
        <p className="mt-5 max-w-prose text-text-muted">
          The private workspace of two co-owners. Neither owner can ever lock the
          other out.
        </p>
      </header>

      <section className="mt-10 rounded-md border border-border bg-panel p-5 sm:p-6">
        <p className="font-mono text-xs tracking-[0.14em] text-gold uppercase">
          Milestone 0 &middot; Setup
        </p>
        <h2 className="mt-2 text-lg font-semibold">The pipeline works</h2>
        <p className="mt-2 max-w-prose text-sm text-text-muted">
          If you are reading this on a preview link <em>and</em> at the production
          address, then a change can travel from a branch to production with every
          check passing and neither owner able to merge alone. That is all M0
          promises. Sign-in arrives in M1, the governance engine in M2.
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-5 font-mono text-xs sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Commit</dt>
            <dd className="tabular-nums">{shortCommit()}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Context</dt>
            <dd>{buildInfo.context}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2">
            <dt className="text-text-muted">Built</dt>
            <dd className="text-right tabular-nums">{builtAt}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs tracking-[0.14em] text-text-muted uppercase">
          Build order
        </h2>
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border">
          {milestones.map((milestone) => (
            <li
              key={milestone.id}
              className="flex items-baseline gap-3 bg-panel px-4 py-3 text-sm"
            >
              <span
                className={`font-mono text-xs tabular-nums ${
                  milestone.done ? "text-gold" : "text-text-muted"
                }`}
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
      </section>

      <footer className="mt-10 border-t border-border pt-5 font-mono text-xs tracking-[0.05em] text-text-muted">
        Private workspace &middot; two owners &middot; not indexed
      </footer>
    </main>
  );
}
