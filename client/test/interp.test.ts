import { describe, expect, it } from 'vitest';
import { V3 } from './fixtures';
import type { Snapshot } from '@qnm/shared';
import { createInterpolator } from '../src/game/interp';
import { createPredictor } from '../src/game/prediction';

function snap(x: number, cx = 0): Snapshot {
  return {
    day: 1, secOfDay: 0, money: 0, stars: 3, stations: [], tiles: [], log: [], staff: [], prices: {},
    ...V3,
    players: [{ id: 'a', name: 'Bố', color: 0, x, z: 0, dir: 0, carry: [], online: true, cap: 4, pick: 0, pickAt: null, carryLevel: 0, speedLevel: 0 }],
    customers: [{ id: 1, x: cx, z: 0, dir: 0, holding: [] }],
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

  it('eases 10% toward the server on small errors', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 0 });
    p.reconcile({ x: 0.5, z: 0 });
    expect(p.pose().x).toBeCloseTo(0.05);
  });

  it('moves locally with the shared movement rules', () => {
    const p = createPredictor();
    p.reconcile({ x: 0, z: 3 });
    p.step({ mx: 1, mz: 0 }, 0.5, () => true);
    expect(p.pose().x).toBeCloseTo(1.6);
  });
});
