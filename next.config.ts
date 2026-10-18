import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The chat used to have its own page; it now lives on the dashboard.
  async redirects() {
    return [{ source: "/chat", destination: "/#chat", permanent: false }];
  },
};

export default nextConfig;
