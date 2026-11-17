import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/test/**/*.test.ts', 'server/test/**/*.test.ts', 'client/test/**/*.test.ts'],
    testTimeout: 20000,
    // Colyseus gọi process.send() khi listen (cho PM2); pool 'forks' của Vitest cũng dùng kênh đó.
    pool: 'threads',
  },
});
