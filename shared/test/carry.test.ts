import { describe, expect, it } from 'vitest';
import { tickCarry } from '../src/sim/carry';
import type { SimEvent } from '../src/sim/events';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat, standAt } from './helpers';

const NEAR_LO = standAt('lo_banh_mi');
const NEAR_KE = standAt('ke_banh_mi');
const NEAR_BAN_TRUNG = standAt('ban_bm_trung');

describe('tickCarry', () => {
  it('picks one item every 0.45 s up to carryCap', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.lo_banh_mi.outputCount = 8;
    const p = putPlayer(w, 'a', NEAR_LO.x, NEAR_LO.z);
    repeat(0.4, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toHaveLength(0);
    expect(p.pickAt).toBe('lo_banh_mi');
    repeat(0.05, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toHaveLength(1);
    repeat(1.35, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual(['banh_mi', 'banh_mi', 'banh_mi', 'banh_mi']);
    expect(w.shops.banh_mi.stations.lo_banh_mi.outputCount).toBe(4);
  });

  it('walking away stops picking with exactly what you have', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.lo_banh_mi.outputCount = 8;
    const p = putPlayer(w, 'a', NEAR_LO.x, NEAR_LO.z);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    Object.assign(p, { x: 0, z: 3 });
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toHaveLength(2);
    expect(p.pickTimer).toBe(0);
    expect(p.pickAt).toBeNull();
  });

  it('drops quickly: 4 loaves onto a shelf within 0.8 s', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', NEAR_KE.x, NEAR_KE.z, ['banh_mi', 'banh_mi', 'banh_mi', 'banh_mi']);
    repeat(0.8, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual([]);
    expect(w.shops.banh_mi.stations.ke_banh_mi.stock).toBe(4);
  });

  it('standing still at the trash bin throws items away, counting their ingredient value', () => {
    const w = createWorld('X', 1);
    const bin = standAt('thung_rac');
    const p = putPlayer(w, 'a', bin.x, bin.z, ['banh_mi', 'banh_mi_trung']);
    const events: SimEvent[] = [];
    repeat(0.4, (dt) => events.push(...tickCarry(w, 'banh_mi', dt)));
    expect(p.carry).toEqual([]);
    expect(w.dayStats.wasted).toBe(8000);
    expect(events.filter((e) => e.type === 'trash')).toHaveLength(2);
  });

  it('walking past the trash bin keeps your items', () => {
    const w = createWorld('X', 1);
    const bin = standAt('thung_rac');
    const p = putPlayer(w, 'a', bin.x, bin.z, ['banh_mi']);
    p.input = { mx: 1, mz: 0 };
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual(['banh_mi']);
  });

  it('drops only the matching item on a shelf and keeps the rest', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', NEAR_KE.x, NEAR_KE.z, ['banh_mi', 'trung_op']);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.stations.ke_banh_mi.stock).toBe(1);
    expect(p.carry).toEqual(['trung_op']);
  });

  it('feeds an assembler only up to inputCap', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.ban_bm_trung.unlocked = true;
    const p = putPlayer(w, 'a', NEAR_BAN_TRUNG.x, NEAR_BAN_TRUNG.z, Array(8).fill('banh_mi'));
    p.carryCap = 8;
    repeat(3.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(w.shops.banh_mi.stations.ban_bm_trung.inputs.banh_mi).toBe(6);
    expect(p.carry.length).toBe(2);
  });

  it('a full shelf accepts nothing', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.ke_banh_mi.stock = 10;
    const p = putPlayer(w, 'a', NEAR_KE.x, NEAR_KE.z, ['banh_mi']);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual(['banh_mi']);
    expect(w.shops.banh_mi.stations.ke_banh_mi.stock).toBe(10);
  });

  it('offline players and players far from stations do nothing', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.lo_banh_mi.outputCount = 8;
    const off = putPlayer(w, 'off', NEAR_LO.x, NEAR_LO.z);
    off.online = false;
    const far = putPlayer(w, 'far', 0, 3);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(off.carry).toEqual([]);
    expect(far.carry).toEqual([]);
    expect(w.shops.banh_mi.stations.lo_banh_mi.outputCount).toBe(8);
  });

  it('does not use a locked station', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.chao_op_la.outputCount = 3; // chảo chưa mở
    const p = putPlayer(w, 'a', standAt('chao_op_la').x, standAt('chao_op_la').z);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual([]);
  });
});
