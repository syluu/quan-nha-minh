import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/content';
import { takeLoan } from '../src/sim/bank';
import { joinPlayer } from '../src/sim/players';
import { buildSettlement, sellStation, sellableStations, trySettle } from '../src/sim/settlement';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { putStaff } from './helpers';

function world(): WorldState {
  const w = createWorld('ABC-DEF', 1);
  joinPlayer(w, 'a', 'Bố');
  const st = w.shops.banh_mi.stations;
  st.chao_op_la.unlocked = true;
  st.ban_bm_trung.unlocked = true;
  return w;
}

describe('selling machines', () => {
  it('only sells bought machines that nothing open depends on', () => {
    const w = world();
    expect(sellableStations(w, 'banh_mi').map((s) => s.instanceId)).toEqual(['ban_bm_trung']);
  });

  it('refunds half of value plus upgrades and locks the machine again', () => {
    const w = world();
    const ban = w.shops.banh_mi.stations.ban_bm_trung;
    ban.level = 1;
    ban.upgradeSpent = 300_000;
    ban.outputCount = 2;
    const before = w.money;
    expect(sellStation(w, 'banh_mi', 'ban_bm_trung', 'a')).toEqual({ ok: true });
    expect(w.money).toBe(before + 900_000);
    expect(ban).toMatchObject({ unlocked: false, paid: 0, level: 0, upgradeSpent: 0, outputCount: 0 });
    expect(sellStation(w, 'banh_mi', 'lo_banh_mi', 'a')).toEqual({ ok: false, error: 'NOT_SELLABLE' });
    expect(sellStation(w, 'banh_mi', 'chao_op_la', 'a')).toEqual({ ok: true }); // giờ bàn trứng đã bán
  });
});

describe('settling with two people acting at once (Review Focus 1)', () => {
  it('a loan that covers the shortfall closes the month once; a sale right after does not pay again', () => {
    const w = world();
    putStaff(w, 'Lan', 'cashier').wageOwed = 1_500_000;
    w.money = 1_000_000;
    w.settlement = buildSettlement(w);
    expect(trySettle(w)).toEqual([]);
    expect(takeLoan(w, 500_000, 1, 'a')).toEqual({ ok: true });
    expect(w.settlement).toBeNull();
    expect(w.money).toBe(0);
    expect(w.months).toHaveLength(1);
    expect(sellStation(w, 'banh_mi', 'ban_bm_trung', 'a')).toEqual({ ok: true });
    expect(w.months).toHaveLength(1);
    expect(w.money).toBe(750_000);
  });
});

describe('bankruptcy (Review Focus 5)', () => {
  it('restarts from the bread cart, keeping the code and every player', () => {
    const w = createWorld('ABC-DEF', 3);
    const bo = joinPlayer(w, 'a', 'Bố');
    const me = joinPlayer(w, 'b', 'Mẹ');
    me.online = false;
    bo.carryLevel = 2;
    bo.carryCap = 8;
    bo.x = 0;
    w.day = 14;
    w.money = 0;
    expect(takeLoan(w, 2_000_000, 1, 'a')).toEqual({ ok: true }); // dùng hết hạn mức
    putStaff(w, 'Lan', 'cashier').wageOwed = 10_000_000;
    w.settlement = buildSettlement(w);
    expect(trySettle(w)).toEqual([{ type: 'bankrupt' }]);
    expect(w.code).toBe('ABC-DEF');
    expect(w.money).toBe(BALANCE.START_MONEY);
    expect(w.day).toBe(1);
    expect(w.settlement).toBeNull();
    expect(w.loans).toEqual([]);
    expect(w.shops.banh_mi.staff).toEqual([]);
    expect(w.shops.banh_mi.stations.lo_banh_mi.unlocked).toBe(true);
    expect(Object.values(w.players).map((p) => [p.name, p.online])).toEqual([['Bố', true], ['Mẹ', false]]);
    expect(w.players.a).toMatchObject({ carryLevel: 0, carryCap: 4, x: 7.5, z: 5.2, carry: [] });
    expect(w.log.at(-1)?.text).toBe('Quán phá sản — bắt đầu lại từ xe bánh mì');
  });
});
