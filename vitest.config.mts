import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'backend',
          environment: 'node',
          include: ['lib/**/*.test.ts', 'app/api/**/*.test.ts'],
          env: {
            DATABASE_PATH: ':memory:',
            AI_PROVIDER: 'anthropic',
            OPENAI_API_KEY: 'test-key',
            ANTHROPIC_API_KEY: 'test-key',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['components/**/*.test.tsx', 'app/**/*.test.tsx'],
          setupFiles: ['./test/setup-frontend.ts'],
        },
      },
    ],
  },
});
