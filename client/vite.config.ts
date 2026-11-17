import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** Mã bản build (commit git) — hiện ở sảnh và thanh dưới để biết đang chạy bản nào. Render có sẵn RENDER_GIT_COMMIT. */
function buildVersion(): string {
  const fromRender = process.env.RENDER_GIT_COMMIT;
  if (fromRender) return fromRender.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(buildVersion()) },
  server: {
    proxy: { '/api': 'http://localhost:2567' },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
