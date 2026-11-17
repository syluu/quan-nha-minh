import { describe, expect, it } from 'vitest';
import { getStationDef } from '../src/content';
import { joinPlayer } from '../src/sim/players';
import { hireStaff, staffStats, staffWage } from '../src/sim/staff';
import { effectiveCycle, effectiveOutputCap, machineUpgradeCost, upgradeMachine, upgradePlayer, upgradeStaff } from '../src/sim/upgrades';
import { createWorld } from '../src/sim/world';

function world() {
  const w = createWorld('X', 1);
  w.money = 20_000_000;
  joinPlayer(w, 'a', 'Mẹ');
  return w;
}

describe('player upgrades', () => {
  it('carry 4 → 12 in four steps, then maxed', () => {
    const w = world();
    for (let i = 0; i < 4; i++) expect(upgradePlayer(w, 'a', 'carry')).toEqual({ ok: true });
    expect(w.players.a.carryCap).toBe(12);
    expect(w.money).toBe(20_000_000 - 2_900_000);
    expect(upgradePlayer(w, 'a', 'carry')).toEqual({ ok: false, error: 'MAXED' });
  });
  it('speed +10% per level', () => {
    const w = world();
    upgradePlayer(w, 'a', 'speed');
    upgradePlayer(w, 'a', 'speed');
    expect(w.players.a.speed).toBeCloseTo(3.84);
    expect(w.players.a.speedLevel).toBe(2);
  });
  it('rejects unknown kinds and short money without changing anything (Review Focus 4)', () => {
    const w = world();
    expect(upgradePlayer(w, 'a', 'fly')).toEqual({ ok: false, error: 'BAD_ROLE' });
    w.money = 100_000;
    expect(upgradePlayer(w, 'a', 'carry')).toEqual({ ok: false, error: 'NO_MONEY' });
    expect(w.players.a.carryCap).toBe(4);
    expect(w.money).toBe(100_000);
  });
});

describe('per-staff upgrades', () => {
  it('trains one named person: faster, carries more, earns more', () => {
    const w = world();
    hireStaff(w, 'banh_mi', 'cashier', null, 'a');
    hireStaff(w, 'banh_mi', 'cook', 'banh_mi', 'a');
    const [lan, hung] = w.shops.banh_mi.staff;
    expect(upgradeStaff(w, 'banh_mi', lan.id, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(20_000_000 - 500_000);
    expect(lan.level).toBe(2);
    expect(staffWage(lan)).toBe(150_000);
    expect(staffStats(lan)).toMatchObject({ speed: 2.56, carry: 4 });
    expect(hung.level).toBe(1);
    expect(w.log.at(-1)?.text).toBe('Mẹ đã nâng Lan lên cấp 2 (lương 150K/ngày)');
    upgradeStaff(w, 'banh_mi', lan.id, 'a');
    upgradeStaff(w, 'banh_mi', lan.id, 'a');
    expect(lan.level).toBe(4);
    expect(upgradeStaff(w, 'banh_mi', lan.id, 'a')).toEqual({ ok: false, error: 'MAXED' });
    expect(upgradeStaff(w, 'banh_mi', 'nope', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('machine upgrades', () => {
  it('bread oven level 1: 1.500K, 15% faster, holds 50% more', () => {
    const w = world();
    expect(machineUpgradeCost('banh_mi', 'lo_banh_mi', 1)).toBe(1_500_000);
    expect(machineUpgradeCost('banh_mi', 'lo_banh_mi', 2)).toBe(2_400_000);
    expect(upgradeMachine(w, 'banh_mi', 'lo_banh_mi', 'a')).toEqual({ ok: true });
    const st = w.shops.banh_mi.stations.lo_banh_mi;
    const def = getStationDef('lo_banh_mi');
    expect(st).toMatchObject({ level: 1, upgradeSpent: 1_500_000 });
    expect(effectiveCycle(def, st)).toBeCloseTo(2.55);
    expect(effectiveOutputCap(def, st)).toBe(12);
  });
  it('max level 3; shelves and locked machines cannot be upgraded', () => {
    const w = world();
    for (let i = 0; i < 3; i++) expect(upgradeMachine(w, 'banh_mi', 'lo_banh_mi', 'a')).toEqual({ ok: true });
    expect(upgradeMachine(w, 'banh_mi', 'lo_banh_mi', 'a')).toEqual({ ok: false, error: 'MAXED' });
    expect(upgradeMachine(w, 'banh_mi', 'ke_banh_mi', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(upgradeMachine(w, 'banh_mi', 'chao_op_la', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(upgradeMachine(w, 'banh_mi', 42, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
  });
});
