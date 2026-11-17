import { describe, expect, it } from 'vitest';
import { getPlaced } from '../src/content';
import { isTileVisible, tickPayTiles } from '../src/sim/payTiles';
import type { SimEvent } from '../src/sim/events';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

const CHAO = getPlaced('banh_mi', 'chao_op_la'); // 800K, requires ke_banh_mi (mở sẵn)
const OFF_TILE = { x: 0, z: 3 };

function setup() {
  const w = createWorld('X', 1);
  const events: SimEvent[] = [];
  const tick = (dt: number) => events.push(...tickPayTiles(w, 'banh_mi', dt));
  return { w, events, tick, chao: w.shops.banh_mi.stations.chao_op_la };
}

describe('tickPayTiles', () => {
  it('walking across (under 2s) costs nothing', () => {
    const { w, tick, chao } = setup();
    const p = putPlayer(w, 'a', CHAO.x, CHAO.z);
    repeat(1.9, tick);
    Object.assign(p, OFF_TILE);
    repeat(1.0, tick);
    expect(w.money).toBe(5_000_000);
    expect(chao.paid).toBe(0);
  });

  it('standing 2s + 1.5s unlocks and charges exactly the cost', () => {
    const { w, tick, chao, events } = setup();
    putPlayer(w, 'a', CHAO.x, CHAO.z);
    repeat(3.5, tick);
    expect(chao.unlocked).toBe(true);
    expect(w.money).toBe(5_000_000 - 800_000);
    expect(w.dayStats.unlockSpend).toBe(800_000);
    expect(events).toContainEqual({ type: 'unlock', shopId: 'banh_mi', instanceId: 'chao_op_la', byPlayerId: 'a' });
  });

  it('keeps partial payment after stepping off and waits 2s again on return', () => {
    const { w, tick, chao } = setup();
    const p = putPlayer(w, 'a', CHAO.x, CHAO.z);
    repeat(2.75, tick);
    expect(chao.paid).toBeGreaterThan(396_000);
    expect(chao.paid).toBeLessThan(404_000);
    const paid = chao.paid;
    Object.assign(p, OFF_TILE);
    repeat(1.0, tick);
    Object.assign(p, { x: CHAO.x, z: CHAO.z });
    repeat(1.0, tick);
    expect(chao.paid).toBe(paid);
    repeat(2.0, tick);
    expect(chao.unlocked).toBe(true);
    expect(w.money).toBe(5_000_000 - 800_000);
  });

  it('drains money to zero but never below and stays locked', () => {
    const { w, tick, chao } = setup();
    w.money = 300_000;
    putPlayer(w, 'a', CHAO.x, CHAO.z);
    repeat(5, (dt) => {
      tick(dt);
      expect(w.money).toBeGreaterThanOrEqual(0);
    });
    expect(w.money).toBe(0);
    expect(chao.paid).toBe(300_000);
    expect(chao.unlocked).toBe(false);
  });

  it('hidden tiles (requires not unlocked) take no money', () => {
    const { w, tick } = setup();
    const ban = getPlaced('banh_mi', 'ban_bm_trung'); // requires chao_op_la
    expect(isTileVisible(w.shops.banh_mi, ban)).toBe(false);
    putPlayer(w, 'a', ban.x, ban.z);
    repeat(5, tick);
    expect(w.money).toBe(5_000_000);
  });

  it('releases the tile when the payer goes offline; the next player waits a fresh 2s (Review Focus 1)', () => {
    const { w, tick, chao } = setup();
    const a = putPlayer(w, 'a', CHAO.x, CHAO.z);
    repeat(2.5, tick);
    const paid = chao.paid;
    expect(paid).toBeGreaterThan(0);
    a.online = false;
    tick(0.05);
    expect(chao.tileOccupant).toBeNull();
    expect(chao.paid).toBe(paid);
    putPlayer(w, 'b', CHAO.x, CHAO.z);
    repeat(1.9, tick);
    expect(chao.paid).toBe(paid);
    repeat(0.5, tick);
    expect(chao.paid).toBeGreaterThan(paid);
    expect(chao.tileOccupant?.playerId).toBe('b');
  });

  it('does not charge while the player is moving across the tile (spec §12: đứng yên)', () => {
    const { w, tick, chao } = setup();
    const p = putPlayer(w, 'a', CHAO.x, CHAO.z);
    p.input = { mx: 0.2, mz: 0 }; // đang bấm phím đi (vị trí giữ nguyên trong test đơn vị)
    repeat(4, tick);
    expect(chao.paid).toBe(0);
    expect(w.money).toBe(5_000_000);
  });

  it('does not charge a player standing in a machine pick-up zone that overlaps the tile (I2)', () => {
    const { w, tick, chao } = setup();
    // Cạnh đông của lò bánh mì (mép x = -3.9): trong vùng nhặt đồ của lò VÀ trong bán kính ô chảo (tâm -3.0).
    putPlayer(w, 'a', -3.45, -2.5);
    repeat(5, tick);
    expect(chao.paid).toBe(0);
    expect(w.money).toBe(5_000_000);
  });
});
