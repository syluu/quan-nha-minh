import { describe, expect, it } from 'vitest';
import { SHOPS } from '../src/content';
import { movePlayer } from '../src/sim/movement';
import { normalizeLoaded } from '../src/sim/snapshot';

/** Một file lưu Kế hoạch 1 (schemaVersion 1) tối thiểu, viết tay như dữ liệu thật trong DB. */
function v1Save() {
  const station = (id: string, unlocked: boolean) => ({
    instanceId: id, unlocked, paid: 0, outputCount: 0, inputs: {}, stock: 0, progress: 0, running: false, blocked: null, tileOccupant: null,
  });
  return {
    schemaVersion: 1,
    code: 'ABC-DEF',
    money: 4_200_000,
    day: 3,
    secOfDay: 100,
    rngState: 7,
    shops: {
      banh_mi: {
        id: 'banh_mi',
        stations: { lo_banh_mi: station('lo_banh_mi', true), ke_banh_mi: station('ke_banh_mi', true), thu_ngan: station('thu_ngan', true), chao_op_la: station('chao_op_la', true) },
        customers: [],
        prices: {},
        ratings: [5, 4],
        nextCustomerIn: 2,
        nextCustomerId: 40,
      },
    },
    players: {
      a: { id: 'a', name: 'Bố', color: 1, x: -6.25, z: -3.8, dir: 0, carry: ['banh_mi'], carryCap: 4, speed: 3.2, online: true, input: { mx: 1, mz: 0 }, transferCd: 0.1 },
    },
    log: [],
    dayStats: { revenue: 10_000, ingredientCost: 4_000, unlockSpend: 0, served: 2, lost: 0 },
  };
}

describe('normalizeLoaded v1 → v2', () => {
  it('fills the new fields with defaults and keeps progress', () => {
    const w = normalizeLoaded(v1Save());
    expect(w.schemaVersion).toBe(2);
    expect(w.money).toBe(4_200_000);
    expect(w.day).toBe(3);
    expect(w.history).toEqual([]);
    expect(w.shops.banh_mi.staff).toEqual([]);
    expect(w.shops.banh_mi.nextStaffId).toBe(1);
    expect(w.shops.banh_mi.firedToday).toBe(0);
    expect(w.shops.banh_mi.stations.chao_op_la.unlocked).toBe(true);
    expect(w.shops.banh_mi.stations.thung_rac.unlocked).toBe(true);
    expect(w.dayStats).toMatchObject({ revenue: 10_000, wages: 0, wasted: 0, sold: {} });
    const p = w.players.a as unknown as Record<string, unknown>;
    expect(p.dropCd).toBe(0);
    expect(p.pickTimer).toBe(0);
    expect(p.pickAt).toBeNull();
    expect('transferCd' in p).toBe(false);
  });

  it('a player saved inside a machine of the new layout can walk out (Review Focus 1)', () => {
    const w = normalizeLoaded(v1Save());
    const p = w.players.a;
    const next = movePlayer(p, { mx: 0, mz: 1 }, p.speed, 0.05, SHOPS.banh_mi, (id) => w.shops.banh_mi.stations[id]?.unlocked ?? false);
    // lò bánh mì: footprint z ∈ [-4.3, -3.3]
    expect(next.z).toBeGreaterThan(-3.3);
  });

  it('rejects unknown versions', () => {
    expect(() => normalizeLoaded({ ...v1Save(), schemaVersion: 3 })).toThrow('UNSUPPORTED_SCHEMA');
  });
});
