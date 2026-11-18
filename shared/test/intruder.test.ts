import { describe, expect, it } from 'vitest';
import { LIFE, SHOPS } from '../src/content';
import { planIntruder, spawnIntruder, tickIntruders } from '../src/sim/intruder';
import { checkBadges } from '../src/sim/fun';
import { toSnapshot } from '../src/sim/snapshot';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

/** Xe bánh mì mở hết kệ, mỗi kệ 3 món; một người chơi đứng trong bếp (xa trộm). */
function world(): WorldState {
  const w = createWorld('X', 9);
  for (const st of Object.values(w.shops.banh_mi.stations)) st.unlocked = true;
  for (const id of ['ke_banh_mi', 'ke_bm_trung', 'ke_thit_nuong', 'ke_bm_thit', 'ke_tra_da']) w.shops.banh_mi.stations[id].stock = 3;
  putPlayer(w, 'a', -6.25, -2.9);
  return w;
}

const stockLeft = (w: WorldState) =>
  ['ke_banh_mi', 'ke_bm_trung', 'ke_thit_nuong', 'ke_bm_thit', 'ke_tra_da'].reduce((n, id) => n + w.shops.banh_mi.stations[id].stock, 0);

describe('thieves and drunks', () => {
  it('only from day 2, at some time during the day', () => {
    const w = createWorld('X', 1);
    planIntruder(w);
    expect(w.intruderAt).toBeNull();
    let found = false;
    for (let d = 2; d < 30 && !found; d++) {
      w.day = d;
      planIntruder(w);
      if (w.intruderAt != null) {
        found = true;
        expect(w.intruderAt).toBeGreaterThan(0);
        expect(['thief', 'drunk']).toContain(w.intruderKind);
      }
    }
    expect(found).toBe(true);
  });

  it('walks into the shop where a player is, at the planned time', () => {
    const w = world();
    w.intruderAt = 10;
    w.intruderKind = 'drunk';
    w.secOfDay = 9;
    expect(tickIntruders(w, 0.05)).toEqual([]);
    w.secOfDay = 10;
    expect(tickIntruders(w, 0.05)).toEqual([{ type: 'intruder', shopId: 'banh_mi', kind: 'drunk' }]);
    expect(w.shops.banh_mi.intruder?.kind).toBe('drunk');
    expect(w.intruderAt).toBeNull();
    expect(toSnapshot(w, 'banh_mi').intruder).toMatchObject({ kind: 'drunk', stolen: [] });
  });

  it('takes items from several shelves (max 8), then walks out with them if nobody catches him', () => {
    const w = world();
    const it = spawnIntruder(w, 'banh_mi', 'thief');
    const events: { type: string }[] = [];
    let maxHere = 0;
    repeat(70, (dt) => {
      events.push(...tickIntruders(w, dt));
      maxHere = Math.max(maxHere, w.shops.banh_mi.intruder?.grabbedHere ?? 0);
    });
    expect(w.shops.banh_mi.intruder).toBeNull();
    expect(it.stolen).toHaveLength(LIFE.INTRUDER_MAX_ITEMS);
    expect(maxHere).toBeLessThanOrEqual(LIFE.INTRUDER_PER_SHELF);
    expect(stockLeft(w)).toBe(15 - LIFE.INTRUDER_MAX_ITEMS);
    expect(it.value).toBeGreaterThan(0);
    expect(events.find((e) => e.type === 'intruderEscaped')).toMatchObject({ items: 8, value: it.value });
    expect(w.dayStats.wasted).toBeGreaterThan(0);
  });

  it('a player who touches him gets the money back (not the items) and he is chased out', () => {
    const w = world();
    const it = spawnIntruder(w, 'banh_mi', 'thief');
    repeat(12, (dt) => tickIntruders(w, dt));
    expect(it.stolen.length).toBeGreaterThan(0);
    const value = it.value;
    const items = it.stolen.length;
    const money = w.money;
    const before = stockLeft(w);
    w.players.a.x = it.x + 0.5;
    w.players.a.z = it.z;
    const ev = tickIntruders(w, 0.05);
    expect(ev[0]).toMatchObject({ type: 'intruderCaught', by: 'a', refund: value, items });
    expect(w.money).toBe(money + value);
    expect(stockLeft(w)).toBe(before);
    expect(it.state).toBe('caught');
    // Bị đuổi ra cửa, không lấy thêm, không mất thêm tiền.
    w.players.a.x = -6.25;
    w.players.a.z = -2.9;
    repeat(30, (dt) => tickIntruders(w, dt));
    expect(w.shops.banh_mi.intruder).toBeNull();
    expect(w.money).toBe(money + value);
    expect(w.lifetime.caught).toBe(1);
  });

  it('leaves early when every shelf is empty; walks out at the exit', () => {
    const w = world();
    for (const st of Object.values(w.shops.banh_mi.stations)) st.stock = 0;
    const it = spawnIntruder(w, 'banh_mi', 'drunk');
    repeat(30, (dt) => tickIntruders(w, dt));
    expect(w.shops.banh_mi.intruder).toBeNull();
    expect(it.stolen).toEqual([]);
    expect({ x: it.x, z: it.z }).toEqual(SHOPS.banh_mi.exit);
  });

  it('three catches earn the "street hero" badge', () => {
    const w = world();
    w.lifetime.caught = 3;
    expect(checkBadges(w).some((e) => e.type === 'badge' && e.id === 'bat_trom')).toBe(true);
  });
});
