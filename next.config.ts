import type { NextConfig } from 'next';

// cacheComponents (and partialPrefetching, which requires it) are left off on purpose:
// Cache Components forbids the `runtime = 'nodejs'` route export that ARCHITECTURE.md §2
// requires, and it would run synchronous better-sqlite3 queries at build time.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
