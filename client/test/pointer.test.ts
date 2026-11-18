import { describe, expect, it } from 'vitest';
import { keysToWorld } from '../src/input';
import { dragToWorld, joystickToWorld } from '../src/pointer';
import { shipperAlertView } from '../src/ui/shipperAlert';
import type { Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';

function snapFixture(): Snapshot {
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, fun: { combo: 0, cat: 'none', catSpot: { x: 0, z: 0 }, tourBus: false, weather: 'sun', festival: null, quests: [], badges: [], today: [] }, day: 1, secOfDay: 0, money: 0, stars: 3,
    tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [],
    ...V3, online: { ...V3.online, registered: true },
  } as Snapshot;
}

describe('mouse joystick (owner request)', () => {
  it('dragging up/right matches the arrow keys; tiny drags are ignored; speed grows with distance', () => {
    const up = joystickToWorld(0, -100);
    const k = keysToWorld({ up: true, down: false, left: false, right: false });
    expect(up.mx).toBeCloseTo(k.mx);
    expect(up.mz).toBeCloseTo(k.mz);
    const right = joystickToWorld(100, 0);
    const kr = keysToWorld({ up: false, down: false, left: false, right: true });
    expect(right.mx).toBeCloseTo(kr.mx);
    expect(right.mz).toBeCloseTo(kr.mz);
    expect(joystickToWorld(3, 4)).toEqual({ mx: 0, mz: 0 });
    const half = joystickToWorld(0, -34);
    expect(Math.hypot(half.mx, half.mz)).toBeCloseTo(0.5, 1);
  });

  it('dragging the view to the right moves the camera target left (floor follows the mouse)', () => {
    const d = dragToWorld(100, 0, 0.02);
    const right = keysToWorld({ up: false, down: false, left: false, right: true });
    expect(d.x * right.mx + d.z * right.mz).toBeCloseTo(-2);
  });
});

describe('shipper alert (owner request)', () => {
  it('shows arrival time, seconds left and needed items; urgent under 15 s', () => {
    const s = snapFixture();
    expect(shipperAlertView(s, null)).toBeNull();
    s.online.shipper = { vehicle: 'bike', x: 0, z: 0, dir: 0, state: 'waiting', needs: ['banh_mi', 'banh_mi'], waited: 20, patience: 60 };
    const v = shipperAlertView(s, 120)!;
    expect(v).toMatchObject({ title: '🛵 Shipper đang chờ ở điểm giao', secondsLeft: 40, urgent: false, needs: 'Cần: 2 Bánh mì' });
    expect(v.arrived).toMatch(/^\d\d:\d\d$/);
    s.online.shipper.waited = 50;
    expect(shipperAlertView(s, 120)!.urgent).toBe(true);
    s.online.shipper.state = 'leaving';
    expect(shipperAlertView(s, 120)).toBeNull();
  });
});
