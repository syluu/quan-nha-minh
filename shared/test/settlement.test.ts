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
    // Nút "Bán" trong bảng kết toán gửi kèm tháng: kết toán đã đóng thì bị từ chối (I4)
    expect(sellStation(w, 'banh_mi', 'ban_bm_trung', 'a', 1)).toEqual({ ok: false, error: 'NO_SETTLEMENT' });
    expect(takeLoan(w, 500_000, 1, 'a', 1)).toEqual({ ok: false, error: 'NO_SETTLEMENT' });
    expect(w.months).toHaveLength(1);
    expect(w.money).toBe(0);
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

describe('no permanent freeze (C1)', () => {
  it('goes bankrupt when the remaining limit is below the minimum loan and nothing can be sold', () => {
    const w = createWorld('ABC-DEF', 3);
    joinPlayer(w, 'a', 'Bố');
    w.money = 0;
    expect(takeLoan(w, 1_500_000, 2, 'a')).toEqual({ ok: true }); // hạn mức còn 300K < 500K
    w.money = 0;
    putStaff(w, 'Lan', 'cashier').wageOwed = 2_000_000;
    w.settlement = buildSettlement(w);
    expect(trySettle(w)).toEqual([{ type: 'bankrupt' }]);
    expect(w.settlement).toBeNull();
  });
});

describe('selling a line with a hired cook (I2)', () => {
  it('is not offered while the cook works that line', async () => {
    const { hireStaff } = await import('../src/sim/staff');
    const w = world();
    w.shops.banh_mi.stations.binh_tra.unlocked = true;
    w.shops.banh_mi.stations.ke_tra_da.unlocked = true;
    expect(sellableStations(w, 'banh_mi').map((s) => s.instanceId)).toContain('ke_tra_da');
    hireStaff(w, 'banh_mi', 'cook', 'tra_da', 'a');
    expect(sellableStations(w, 'banh_mi').map((s) => s.instanceId)).not.toContain('ke_tra_da');
    expect(sellStation(w, 'banh_mi', 'ke_tra_da', 'a')).toEqual({ ok: false, error: 'NOT_SELLABLE' });
  });
});

describe('while the month is being settled (M1, M2)', () => {
  it('firing refreshes the amount due; spending on upgrades and ads is paused', async () => {
    const { fireStaff } = await import('../src/sim/staff');
    const { upgradePlayer } = await import('../src/sim/upgrades');
    const { runCampaign } = await import('../src/sim/marketing');
    const w = world();
    w.money = 1_000_000;
    putStaff(w, 'Lan', 'cashier').wageOwed = 700_000;
    const hung = putStaff(w, 'Hùng');
    hung.wageOwed = 700_000;
    w.settlement = buildSettlement(w);
    expect(trySettle(w)).toEqual([]);
    expect(upgradePlayer(w, 'a', 'carry')).toEqual({ ok: false, error: 'PAUSED' });
    expect(runCampaign(w, 'banh_mi', 'to_roi', 'a')).toEqual({ ok: false, error: 'PAUSED' });
    expect(fireStaff(w, 'banh_mi', hung.id, 'a')).toEqual({ ok: true }); // trả 820K, còn 180K
    // còn nợ Lan 700K, tiền 180K → bảng phải cập nhật
    expect(w.settlement?.wages).toBe(700_000);
  });
});
