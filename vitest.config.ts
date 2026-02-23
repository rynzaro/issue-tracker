import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", "legacy"],
    coverage: {
      provider: "v8",
      include: [
        "lib/services/**",
        "lib/schema/**",
        "lib/util.ts",
        "lib/formUtils.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
