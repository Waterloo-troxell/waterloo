/**
 * Where this build came from. The deploy workflow sets these; a local
 * `npm run dev` has none of them, which is itself useful information.
 */
export const buildInfo = {
  commit: process.env.NEXT_PUBLIC_BUILD_SHA ?? "local",
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
  context: process.env.NEXT_PUBLIC_DEPLOY_CONTEXT ?? "development",
} as const;

export function shortCommit(): string {
  return buildInfo.commit === "local" ? "local" : buildInfo.commit.slice(0, 7);
}
