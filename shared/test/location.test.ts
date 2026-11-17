import { describe, expect, it } from 'vitest';
import { SHOPS, getPlaced } from '../src/content';
import { tickCarry } from '../src/sim/carry';
import { isCashierManned } from '../src/sim/customers';
import { tickPayTiles } from '../src/sim/payTiles';
import { tick } from '../src/sim/tick';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

/** Hai quán cùng toạ độ: chỉ người đứng trong quán đó mới được tính (Review Focus 1). */
describe('location (plan 5)', () => {
  it('a pay tile only charges the player standing in that shop', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    const chaoCha = getPlaced('com_tam', 'chao_cha'); // 1.500K, cần kệ cơm tấm sườn (có sẵn)
    putPlayer(w, 'banhmi', chaoCha.x, chaoCha.z, [], 'banh_mi');
    repeat(4, (dt) => tickPayTiles(w, 'com_tam', dt));
    expect(w.shops.com_tam.stations.chao_cha.unlocked).toBe(false);
    expect(w.money).toBe(5_000_000);

    putPlayer(w, 'comtam', chaoCha.x, chaoCha.z, [], 'com_tam');
    repeat(4, (dt) => tickPayTiles(w, 'com_tam', dt));
    expect(w.shops.com_tam.stations.chao_cha.unlocked).toBe(true);
    expect(w.money).toBe(5_000_000 - 1_500_000);
  });

  it('the cashier only counts players standing in that shop', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    const wp = getPlaced('com_tam', 'thu_ngan').workPoint;
    const p = putPlayer(w, 'a', wp.x, wp.z, [], 'banh_mi');
    expect(isCashierManned(w, 'banh_mi')).toBe(true); // cùng toạ độ ở xe bánh mì
    expect(isCashierManned(w, 'com_tam')).toBe(false);
    p.location = 'com_tam';
    expect(isCashierManned(w, 'banh_mi')).toBe(false);
    expect(isCashierManned(w, 'com_tam')).toBe(true);
  });

  it('carrying only touches the stations of the shop the player is in', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    w.shops.com_tam.stations.noi_com.outputCount = 3;
    w.shops.banh_mi.stations.lo_banh_mi.outputCount = 3;
    const wp = getPlaced('com_tam', 'noi_com').workPoint; // cùng chỗ với lò bánh mì
    const p = putPlayer(w, 'a', wp.x, wp.z, [], 'com_tam');
    repeat(1, (dt) => {
      tickCarry(w, 'banh_mi', dt);
      tickCarry(w, 'com_tam', dt);
    });
    expect(p.carry.every((it) => it === 'com')).toBe(true);
    expect(p.carry.length).toBeGreaterThan(0);
    expect(w.shops.banh_mi.stations.lo_banh_mi.outputCount).toBe(3);
  });

  it('unrented shops do not run; a player moves inside the layout of their own shop', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', 0, 2, [], 'banh_mi');
    tick(w, 1);
    expect(w.shops.com_tam.customers).toEqual([]);
    expect(w.shops.com_tam.stations.noi_com.outputCount).toBe(0);
    // Quán có bàn sâu tới z=8: đi về phía trước vẫn đi được quá mép z=5.5 của xe bánh mì.
    w.shops.com_tam.owned = true;
    Object.assign(p, { location: 'com_tam', x: 4, z: 5, input: { mx: 0, mz: 1 } });
    repeat(1, (dt) => tick(w, dt));
    expect(p.z).toBeGreaterThan(SHOPS.banh_mi.bounds.maxZ);
  });
});
