import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Governance tests talk to Postgres and must not race each other.
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["verbose"],
  },
});
