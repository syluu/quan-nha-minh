import { describe, expect, it } from 'vitest';
import { joinPlayer } from '../src/sim/players';
import { normalizeLoaded, toSnapshot } from '../src/sim/snapshot';
import { spawnCustomer } from '../src/sim/customers';
import { createWorld } from '../src/sim/world';

describe('normalizeLoaded (Review Focus 4)', () => {
  it('clears transient state after a reload but keeps progress', () => {
    const w = createWorld('ABC-DEF', 3);
    const p = joinPlayer(w, 'a', 'Bố');
    p.input = { mx: 1, mz: 0 };
    w.money = 1_234_000;
    w.day = 4;
    w.secOfDay = 120;
    spawnCustomer(w, 'banh_mi');
    w.shops.banh_mi.stations.chao_op_la.tileOccupant = { playerId: 'a', sec: 1 };
    w.shops.banh_mi.stations.chao_op_la.paid = 100_000;

    const loaded = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(loaded.shops.banh_mi.customers).toEqual([]);
    expect(loaded.players.a.online).toBe(false);
    expect(loaded.players.a.input).toEqual({ mx: 0, mz: 0 });
    expect(loaded.shops.banh_mi.stations.chao_op_la.tileOccupant).toBeNull();
    expect(loaded.shops.banh_mi.stations.chao_op_la.paid).toBe(100_000);
    expect(loaded.money).toBe(1_234_000);
    expect(loaded.day).toBe(4);
    expect(loaded.secOfDay).toBe(120);
  });

  it('rejects an unknown schema version', () => {
    const w = createWorld('ABC-DEF', 3);
    expect(() => normalizeLoaded({ ...w, schemaVersion: 99 })).toThrow();
    expect(() => normalizeLoaded(null)).toThrow();
  });
});

describe('toSnapshot', () => {
  it('lists only visible pay tiles and the online flag of players', () => {
    const w = createWorld('ABC-DEF', 3);
    joinPlayer(w, 'a', 'Bố');
    const s = toSnapshot(w, 'banh_mi');
    expect(s.tiles.map((t) => t.instanceId).sort()).toEqual(['binh_tra', 'chao_op_la']);
    expect(s.tiles.find((t) => t.instanceId === 'chao_op_la')).toEqual({ instanceId: 'chao_op_la', cost: 800_000, paid: 0, occupantSec: 0 });
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({ id: 'a', name: 'Bố', online: true, carry: [] });
    expect(s.money).toBe(5_000_000);
    expect(s.stars).toBe(3);
  });
});
