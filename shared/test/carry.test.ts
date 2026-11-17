import { describe, expect, it } from 'vitest';
import { tickCarry } from '../src/sim/carry';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat, standAt } from './helpers';

const NEAR_LO = standAt('lo_banh_mi');
const NEAR_KE = standAt('ke_banh_mi');
const NEAR_BAN_TRUNG = standAt('ban_bm_trung');

describe('tickCarry', () => {
  it('picks one item per TRANSFER_INTERVAL up to carryCap', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.lo_banh_mi.outputCount = 8;
    const p = putPlayer(w, 'a', NEAR_LO.x, NEAR_LO.z);
    repeat(1.0, (dt) => tickCarry(w, 'banh_mi', dt));
    expect(p.carry).toEqual(['banh_mi', 'banh_mi', 'banh_mi', 'banh_mi']);
    expect(w.shops.banh_mi.stations.lo_banh_mi.outputCount).toBe(4);
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
