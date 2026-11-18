import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { staffView, upgradeView } from '../src/ui/menu/views';

function snap(): Snapshot {
  const st = (instanceId: string, unlocked: boolean, level = 0) => ({ instanceId, unlocked, outputCount: 0, stock: 0, inputs: {}, enabled: true, seats: [], blocked: null, level });
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, fun: { combo: 0, cat: 'none', catSpot: { x: 0, z: 0 }, tourBus: false, busSpot: { x: 0, z: 0 }, weather: 'sun', festival: null, quests: [], badges: [], today: [] }, life: { tier: 0, earned: 0, nextTierAt: null, regulars: [], party: null }, day: 3, secOfDay: 0, money: 0, stars: 3, tiles: [], customers: [], log: [], prices: {}, ...V3,
    players: [{ id: 'me', name: 'Bố', color: 0, x: 0, z: 0, dir: 0, carry: [], online: true, cap: 6, pick: 0, pickAt: null, carryLevel: 1, speedLevel: 5, location: 'banh_mi', emote: null, boost: false, outfit: { hat: 'non_la', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' }, wardrobe: [] }],
    stations: [st('lo_banh_mi', true, 1), st('ke_banh_mi', true), st('thu_ngan', true), st('chao_op_la', false)],
    staff: [{ id: 's1', name: 'Lan', role: 'cashier', item: null, x: 0, z: 0, dir: 0, carry: [], level: 2, wageOwed: 450_000, energy: 100, cheer: false, rest: 0, tireless: false }],
  };
}

describe('upgradeView', () => {
  it('shows my next carry/speed upgrade and the open machines', () => {
    const v = upgradeView(snap(), 'me');
    expect(v.me.carry).toEqual({ level: 1, max: 4, now: '6 món', next: '8 món', cost: '500K' });
    expect(v.me.speed).toEqual({ level: 5, max: 5, now: '150%', next: null, cost: null });
    expect(v.machines).toEqual([
      { instanceId: 'lo_banh_mi', name: 'Lò bánh mì', level: 1, enabled: true, max: 3, cycle: '2,6 giây/món', cap: 'chứa 12', cost: '2.400K' },
    ]);
  });
});

describe('staffView with levels', () => {
  it('describes each person: level, speed, carry, wage, owed, next training cost', () => {
    const v = staffView(snap());
    expect(v.cashier.detail).toEqual({ level: 2, speedPct: 80, carry: 4, wage: '150K', owed: '450K', payOnFire: '600K', nextTrain: '800K', energy: 100, mood: '💪 Khoẻ re', cheer: false, rest: 0, tireless: false });
  });
});
