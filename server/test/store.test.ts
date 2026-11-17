import { describe, expect, it } from 'vitest';
import { createWorld } from '@qnm/shared';
import { MemoryWorldStore } from '../src/persistence/memoryWorldStore';
import { PgWorldStore } from '../src/persistence/pgWorldStore';
import type { WorldStore } from '../src/persistence/worldStore';

function contract(name: string, make: () => Promise<WorldStore>) {
  describe(name, () => {
    it('create → load returns an equal state; save overwrites', async () => {
      const store = await make();
      const code = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const w = createWorld(code, 1);
      await store.create(w);
      expect(await store.exists(code)).toBe(true);
      expect(await store.load(code)).toEqual(w);
      w.money = 42;
      await store.save(w);
      expect((await store.load(code)) as { money: number }).toMatchObject({ money: 42 });
    });

    it('load of an unknown code is null', async () => {
      const store = await make();
      expect(await store.load('NOPE-00')).toBeNull();
      expect(await store.exists('NOPE-00')).toBe(false);
    });

    it('a loaded state is a copy, not the stored object', async () => {
      const store = await make();
      const w = createWorld(`C${Math.random().toString(36).slice(2, 7)}`, 1);
      await store.create(w);
      const a = (await store.load(w.code)) as { money: number };
      a.money = 1;
      expect(((await store.load(w.code)) as { money: number }).money).toBe(5_000_000);
    });
  });
}

contract('MemoryWorldStore', async () => new MemoryWorldStore());

const PG = process.env.TEST_DATABASE_URL;
describe.skipIf(!PG)('PgWorldStore', () => {
  contract('PgWorldStore (TEST_DATABASE_URL)', async () => {
    const s = new PgWorldStore(PG!);
    await s.init();
    return s;
  });
});
