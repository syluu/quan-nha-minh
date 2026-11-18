import { describe, expect, it } from 'vitest';
import { V3 } from './fixtures';
import type { Snapshot } from '@qnm/shared';
import { createInterpolator } from '../src/game/interp';
import { createPredictor } from '../src/game/prediction';

function snap(x: number, cx = 0): Snapshot {
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, day: 1, secOfDay: 0, money: 0, stars: 3, stations: [], tiles: [], log: [], staff: [], prices: {},
    ...V3,
    players: [{ id: 'a', name: 'Bố', color: 0, x, z: 0, dir: 0, carry: [], online: true, cap: 4, pick: 0, pickAt: null, carryLevel: 0, speedLevel: 0, location: 'banh_mi', outfit: { hat: 'non_la', hair: 'toc_ngan_den', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' }, wardrobe: [] }],
    customers: [{ id: 1, x: cx, z: 0, dir: 0, holding: [], sitting: false }],
  };
}

describe('createInterpolator', () => {
  it('interpolates positions between the two snapshots around now - delay', () => {
    const it0 = createInterpolator(100);
    it0.push(snap(0, 10), 0);
    it0.push(snap(2, 20), 100);
    const s = it0.sample(150)!;
    expect(s.players[0].x).toBeCloseTo(1);
    expect(s.customers[0].x).toBeCloseTo(15);
  });

  it('returns the only snapshot when there is just one, null when empty', () => {
    const i = createInterpolator(100);
    expect(i.sample(0)).toBeNull();
    i.push(snap(5), 0);
    expect(i.sample(1000)!.players[0].x).toBe(5);
  });

  it('a customer that only exists in the newer snapshot appears at its own position', () => {
    const i = createInterpolator(100);
    const a = snap(0);
    a.customers = [];
    i.push(a, 0);
    i.push(snap(2, 7), 100);
    expect(i.sample(150)!.customers[0].x).toBe(7);
  });
});

describe('createPredictor', () => {
  it('snaps to the server when off by more than 1.5 m', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 0 });
    p.reconcile({ x: 2, z: 0 });
    expect(p.pose().x).toBe(2);
  });

  it('standing still: glides smoothly to the server position, then settles exactly (no jitter)', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 3 });
    p.reconcile({ x: 0.5, z: 3 });
    expect(p.pose().x).toBe(0); // không nhảy ngay khi có snapshot
    const xs: number[] = [];
    for (let i = 0; i < 60; i++) xs.push(p.step({ mx: 0, mz: 0 }, 1 / 60, () => true).x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]); // đi một chiều, không giật qua lại
    expect(xs.at(-1)).toBe(0.5);
    // Snapshot lặp lại cùng vị trí: đứng im tuyệt đối.
    for (let i = 0; i < 30; i++) {
      if (i % 6 === 0) p.reconcile({ x: 0.5, z: 3 });
      expect(p.step({ mx: 0, mz: 0 }, 1 / 60, () => true).x).toBe(0.5);
    }
  });

  it('uses the upgraded speed passed in, matching the server', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 3 });
    // Máy chủ đi cùng tốc độ → đích luôn trùng vị trí dự đoán.
    for (let i = 0; i < 30; i++) {
      p.step({ mx: 1, mz: 0 }, 1 / 60, () => true, 3.2 * 1.5);
      p.reconcile({ x: p.pose().x, z: 3 });
    }
    expect(p.pose().x).toBeCloseTo(2.4, 1);
  });

  it('moves locally with the shared movement rules', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 3 });
    for (let i = 0; i < 30; i++) {
      p.step({ mx: 1, mz: 0 }, 1 / 60, () => true);
      p.reconcile({ x: p.pose().x, z: 3 });
    }
    expect(p.pose().x).toBeCloseTo(1.6, 1);
  });
});
