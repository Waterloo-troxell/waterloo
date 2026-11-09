import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["verbose"],
    // Governance tests share one real database and reset it between tests,
    // so test files must run one at a time, never side by side.
    fileParallelism: false,
    // Real sign-ins, real 2FA, bcrypt: slower than unit tests.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
