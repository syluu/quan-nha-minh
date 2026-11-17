import { MemoryWorldStore } from './memoryWorldStore';
import { PgWorldStore } from './pgWorldStore';
import type { WorldStore } from './worldStore';

export type { WorldStore } from './worldStore';
export { MemoryWorldStore } from './memoryWorldStore';
export { PgWorldStore } from './pgWorldStore';

/** Có DATABASE_URL → Postgres; không có → RAM (cảnh báo: mất dữ liệu khi tắt server). */
export async function createStore(env: { DATABASE_URL?: string }): Promise<WorldStore> {
  if (env.DATABASE_URL) {
    const s = new PgWorldStore(env.DATABASE_URL);
    await s.init();
    return s;
  }
  console.warn('[store] Không có DATABASE_URL — dùng bộ nhớ tạm, tắt server là mất dữ liệu.');
  return new MemoryWorldStore();
}
