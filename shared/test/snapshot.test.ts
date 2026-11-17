import { describe, expect, it } from 'vitest';
import { joinPlayer } from '../src/sim/players';
import { normalizeLoaded, toSnapshot } from '../src/sim/snapshot';
import { spawnCustomer } from '../src/sim/customers';
import { createWorld } from '../src/sim/world';

describe('normalizeLoaded (Review Focus 4)', () => {
  it('clears transient state after a reload but keeps progress', () => {
    const w = createWorld('ABC-DEF', 3);
    const p = joinPlayer(w, 'a', 'Bố');
    p.input = { mx: 1, mz: 0 };
    w.money = 1_234_000;
    w.day = 4;
    w.secOfDay = 120;
    spawnCustomer(w, 'banh_mi');
    w.shops.banh_mi.stations.chao_op_la.tileOccupant = { playerId: 'a', sec: 1 };
    w.shops.banh_mi.stations.chao_op_la.paid = 100_000;

    const loaded = normalizeLoaded(JSON.parse(JSON.stringify(w)));
    expect(loaded.shops.banh_mi.customers).toEqual([]);
    expect(loaded.players.a.online).toBe(false);
    expect(loaded.players.a.input).toEqual({ mx: 0, mz: 0 });
    expect(loaded.shops.banh_mi.stations.chao_op_la.tileOccupant).toBeNull();
    expect(loaded.shops.banh_mi.stations.chao_op_la.paid).toBe(100_000);
    expect(loaded.money).toBe(1_234_000);
    expect(loaded.day).toBe(4);
    expect(loaded.secOfDay).toBe(120);
  });

  it('rejects an unknown schema version', () => {
    const w = createWorld('ABC-DEF', 3);
    expect(() => normalizeLoaded({ ...w, schemaVersion: 99 })).toThrow();
    expect(() => normalizeLoaded(null)).toThrow();
  });
});

describe('toSnapshot', () => {
  it('lists only visible pay tiles and the online flag of players', () => {
    const w = createWorld('ABC-DEF', 3);
    joinPlayer(w, 'a', 'Bố');
    const s = toSnapshot(w, 'banh_mi');
    expect(s.tiles.map((t) => t.instanceId).sort()).toEqual(['binh_tra', 'chao_op_la']);
    expect(s.tiles.find((t) => t.instanceId === 'chao_op_la')).toEqual({ instanceId: 'chao_op_la', cost: 800_000, paid: 0, occupantSec: 0 });
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({ id: 'a', name: 'Bố', online: true, carry: [] });
    expect(s.money).toBe(5_000_000);
    expect(s.stars).toBe(3);
  });
});

describe('toSnapshot v3', () => {
  it('carries month, upgrades, campaigns, loans and settlement data', async () => {
    const { takeLoan } = await import('../src/sim/bank');
    const { runCampaign } = await import('../src/sim/marketing');
    const { upgradePlayer, upgradeStaff } = await import('../src/sim/upgrades');
    const { hireStaff } = await import('../src/sim/staff');
    const { buildSettlement } = await import('../src/sim/settlement');
    const w = createWorld('ABC-DEF', 3);
    w.money = 20_000_000;
    joinPlayer(w, 'a', 'Bố');
    takeLoan(w, 1_000_000, 2, 'a');
    runCampaign(w, 'banh_mi', 'to_roi', 'a');
    upgradePlayer(w, 'a', 'carry');
    hireStaff(w, 'banh_mi', 'cashier', null, 'a');
    upgradeStaff(w, 'banh_mi', w.shops.banh_mi.staff[0].id, 'a');
    let s = toSnapshot(w, 'banh_mi');
    expect(s.month).toBe(1);
    expect(s.daysToMonthEnd).toBe(7);
    expect(s.campaigns).toEqual([{ id: 'to_roi', daysLeft: 1 }]);
    expect(s.loans).toEqual([{ id: 'L1', principal: 1_000_000, remaining: 1_090_000, installment: 545_000, monthsLeft: 2 }]);
    expect(s.maxLoan).toBe(900_000);
    expect(s.players[0]).toMatchObject({ carryLevel: 1, speedLevel: 0, cap: 6 });
    expect(s.staff[0]).toMatchObject({ level: 2, wageOwed: 0 });
    expect(s.stations.find((x) => x.instanceId === 'lo_banh_mi')).toMatchObject({ level: 0 });
    expect(s.settlement).toBeNull();
    expect(s.sellable).toEqual([]);
    w.day = 7;
    w.settlement = buildSettlement(w);
    s = toSnapshot(w, 'banh_mi');
    expect(s.daysToMonthEnd).toBe(1);
    expect(s.settlement).toMatchObject({ month: 1 });
  });
});
