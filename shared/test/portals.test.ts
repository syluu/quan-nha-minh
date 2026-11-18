import { describe, expect, it } from 'vitest';
import { BALANCE, SHOP_IDS, SHOPS, getStationDef } from '../src/content';
import type { ShopId } from '../src/content';
import { catSpot } from '../src/sim/fun';
import { portalPads, portalSnapshot, tickPortals } from '../src/sim/portals';
import { tick } from '../src/sim/tick';
import { createShop, createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

function world(owned: ShopId[] = ['banh_mi', 'farm']) {
  const w = createWorld('X', 1);
  for (const id of owned) if (!w.shops[id].owned) w.shops[id] = createShop(id, true);
  return w;
}

describe('portal pads', () => {
  it('one pad per other owned place, none when only the bánh mì cart is owned', () => {
    expect(portalPads(world(['banh_mi']), 'banh_mi')).toEqual([]);
    const w = world(['banh_mi', 'com_tam', 'farm']);
    expect(portalPads(w, 'banh_mi').map((p) => p.to)).toEqual(['com_tam', 'farm']);
    expect(portalPads(w, 'farm').map((p) => p.to)).toEqual(['banh_mi', 'com_tam']);
  });

  it('pads stay on the floor, clear of stations, the entrance and the stray-cat spot, in every place', () => {
    const w = world([...SHOP_IDS]);
    const r = BALANCE.PORTAL_RADIUS;
    for (const id of SHOP_IDS) {
      const layout = SHOPS[id];
      const b = layout.bounds;
      for (const pad of portalPads(w, id)) {
        expect(pad.x - r).toBeGreaterThanOrEqual(b.minX);
        expect(pad.x + r).toBeLessThanOrEqual(b.maxX);
        expect(pad.z - r).toBeGreaterThanOrEqual(b.minZ);
        expect(pad.z + r).toBeLessThanOrEqual(b.maxZ);
        // Người vừa sang xuất hiện ở lối vào: không được đứng trúng ô để bị chuyển ngược lại.
        expect(Math.hypot(pad.x - layout.entrance.x, pad.z - layout.entrance.z)).toBeGreaterThan(2);
        if (id !== 'farm') expect(Math.hypot(pad.x - catSpot(id).x, pad.z - catSpot(id).z)).toBeGreaterThan(r + 1.2);
        for (const s of layout.stations) {
          const fp = getStationDef(s.def).footprint;
          const dx = Math.max(Math.abs(pad.x - s.x) - fp.w / 2, 0);
          const dz = Math.max(Math.abs(pad.z - s.z) - fp.d / 2, 0);
          expect(Math.hypot(dx, dz), `${id}: ô sang ${pad.to} đè lên ${s.instanceId}`).toBeGreaterThan(r);
        }
      }
    }
  });
});

describe('tickPortals', () => {
  it('standing still 1 second on a pad moves the player there, carrying their items', () => {
    const w = world();
    const pad = portalPads(w, 'banh_mi')[0];
    const p = putPlayer(w, 'a', pad.x, pad.z, ['banh_mi']);
    repeat(0.9, (dt) => tickPortals(w, 'banh_mi', dt));
    expect(p.location).toBe('banh_mi');
    expect(portalSnapshot(w, 'banh_mi')[0].sec).toBeCloseTo(0.9, 5);
    repeat(0.15, (dt) => tickPortals(w, 'banh_mi', dt));
    expect(p.location).toBe('farm');
    expect({ x: p.x, z: p.z }).toEqual(SHOPS.farm.entrance);
    expect(p.carry).toEqual(['banh_mi']);
    expect(p.portal).toBeNull();
  });

  it('walking across, stepping off, or having the menu open does not move you', () => {
    const w = world();
    const pad = portalPads(w, 'banh_mi')[0];
    const p = putPlayer(w, 'a', pad.x, pad.z);
    p.input = { mx: 1, mz: 0 };
    repeat(2, (dt) => tickPortals(w, 'banh_mi', dt));
    expect(p.location).toBe('banh_mi');

    p.input = { mx: 0, mz: 0 };
    repeat(0.6, (dt) => tickPortals(w, 'banh_mi', dt));
    Object.assign(p, { x: 0, z: -2 });
    repeat(0.1, (dt) => tickPortals(w, 'banh_mi', dt));
    Object.assign(p, { x: pad.x, z: pad.z });
    repeat(0.6, (dt) => tickPortals(w, 'banh_mi', dt));
    expect(p.location).toBe('banh_mi'); // bộ đếm chạy lại từ đầu khi rời ô

    p.inMenu = true;
    repeat(2, (dt) => tickPortals(w, 'banh_mi', dt));
    expect(p.location).toBe('banh_mi');
  });

  it('works through the full tick, and arriving does not bounce you back', () => {
    const w = world();
    const pad = portalPads(w, 'banh_mi')[0];
    const p = putPlayer(w, 'a', pad.x, pad.z);
    repeat(1.2, (dt) => tick(w, dt));
    expect(p.location).toBe('farm');
    repeat(3, (dt) => tick(w, dt));
    expect(p.location).toBe('farm');
  });
});
