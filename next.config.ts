import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module: must be loaded by Node at runtime, never bundled.
  serverExternalPackages: ["better-sqlite3"],
  // cacheComponents is left off on purpose: it forbids the `runtime` route
  // segment export that the SQLite and chat routes declare.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
