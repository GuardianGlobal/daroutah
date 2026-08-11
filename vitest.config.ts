import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 1. Tells Vitest to inject describe/it/expect into the global execution context
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
