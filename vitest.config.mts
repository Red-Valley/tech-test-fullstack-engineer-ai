import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the `@/` import alias from tsconfig.json, which route handlers use.
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
