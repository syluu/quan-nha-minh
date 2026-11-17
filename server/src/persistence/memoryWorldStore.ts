import type { WorldState } from '@qnm/shared';
import type { WorldStore } from './worldStore';

/** Lưu trong RAM — dùng khi chạy thử không có DATABASE_URL và trong test. Mất khi tắt server. */
export class MemoryWorldStore implements WorldStore {
  private data = new Map<string, string>();

  async create(world: WorldState): Promise<void> {
    if (this.data.has(world.code)) throw new Error('CODE_TAKEN');
    this.data.set(world.code, JSON.stringify(world));
  }

  async load(code: string): Promise<unknown | null> {
    const raw = this.data.get(code);
    return raw ? JSON.parse(raw) : null;
  }

  async save(world: WorldState): Promise<void> {
    this.data.set(world.code, JSON.stringify(world));
  }

  async exists(code: string): Promise<boolean> {
    return this.data.has(code);
  }
}
