import { describe, expect, it } from 'vitest';
import { SHOPS, getStationDef } from '../src/content';
import { assetValue } from '../src/sim/bank';
import { buildSettlement, sellStation, sellableStations } from '../src/sim/settlement';
import { canRent, isShopComplete, rentShop, returnShop, travel } from '../src/sim/shops';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { putPlayer, putStaff } from './helpers';

function completeAll(w: WorldState, shopId: 'banh_mi' | 'com_tam' | 'pho_cafe') {
  for (const p of SHOPS[shopId].stations) {
    const kind = getStationDef(p.def).kind;
    if (kind === 'producer' || kind === 'assembler' || kind === 'display') w.shops[shopId].stations[p.instanceId].unlocked = true;
  }
}

function settling(w: WorldState) {
  w.day = 7;
  w.settlement = buildSettlement(w);
}

describe('renting a new place (plan 5)', () => {
  it('needs every machine and shelf of the shops you have', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    w.money = 50_000_000;
    expect(isShopComplete(w, 'banh_mi')).toBe(false);
    expect(canRent(w)).toBe(false);
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: false, error: 'NOT_READY' });
    completeAll(w, 'banh_mi');
    expect(canRent(w)).toBe(true);
  });

  it('charges the deposit, starts the shop with its starter set and moves the renter there', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', 0, 2);
    completeAll(w, 'banh_mi');
    w.money = 9_000_000;
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: true });
    expect(w.money).toBe(1_000_000);
    expect(w.shops.com_tam.owned).toBe(true);
    expect(w.shops.com_tam.stations.noi_com.unlocked).toBe(true);
    expect(w.shops.com_tam.stations.chao_cha.unlocked).toBe(false);
    expect(p.location).toBe('com_tam');
    expect({ x: p.x, z: p.z }).toEqual(SHOPS.com_tam.entrance);
    // Quán mới chưa mở hết → chưa thuê tiếp được.
    w.money = 50_000_000;
    expect(rentShop(w, 'pho_cafe', 'a')).toEqual({ ok: false, error: 'NOT_READY' });
  });

  it('refuses cleanly without changing money (Review Focus 2)', () => {
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    completeAll(w, 'banh_mi');
    w.money = 7_999_000;
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
    expect(rentShop(w, 'banh_mi', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(rentShop(w, 'nha_hang', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    w.money = 20_000_000;
    settling(w);
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: false, error: 'PAUSED' });
    w.settlement = null;
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: true });
    expect(rentShop(w, 'com_tam', 'a')).toEqual({ ok: false, error: 'NO_SLOT' });
    expect(w.money).toBe(12_000_000);
    expect(w.shops.pho_cafe.owned).toBe(false);
  });

  it('counts the deposit as an asset (instead of the starter set)', () => {
    const w = createWorld('X', 1);
    const before = assetValue(w);
    putPlayer(w, 'a', 0, 2);
    completeAll(w, 'banh_mi');
    const complete = assetValue(w);
    w.money = 8_000_000;
    rentShop(w, 'com_tam', 'a');
    expect(assetValue(w)).toBe(complete + 8_000_000);
    expect(before).toBe(4_000_000);
  });
});

describe('travel', () => {
  it('only to shops you have; carries items along', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', 0, 2, ['banh_mi']);
    expect(travel(w, 'a', 'com_tam')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(travel(w, 'a', 'xyz')).toEqual({ ok: false, error: 'NOT_FOUND' });
    w.shops.com_tam.owned = true;
    expect(travel(w, 'a', 'com_tam')).toEqual({ ok: true });
    expect(p.location).toBe('com_tam');
    expect(p.carry).toEqual(['banh_mi']);
    expect({ x: p.x, z: p.z }).toEqual(SHOPS.com_tam.entrance);
  });
});

describe('rent and returning a place', () => {
  it('rent goes into the month settlement, pro-rated for the first month', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    w.shops.com_tam.rentedDay = 1;
    w.day = 7;
    expect(buildSettlement(w).rent).toBe(4_000_000);
    w.shops.com_tam.rentedDay = 6; // thuê 2 ngày cuối tháng
    expect(buildSettlement(w).rent).toBe(Math.round((4_000_000 * 2) / 7 / 1000) * 1000);
    w.shops.pho_cafe.owned = true;
    w.shops.pho_cafe.rentedDay = 1;
    w.shops.com_tam.rentedDay = 1;
    w.day = 14;
    expect(buildSettlement(w).rent).toBe(10_000_000);
  });

  it('is offered in the sell list and returns half the deposit + machines; players there go back to the cart (Review Focus 4)', () => {
    const w = createWorld('X', 1);
    const p = putPlayer(w, 'a', 0, 2, ['com'], 'com_tam');
    putPlayer(w, 'b', 0, 2, [], 'banh_mi');
    w.shops.com_tam.owned = true;
    w.shops.com_tam.stations.chao_cha.unlocked = true; // 1.500K
    const cook = putStaff(w, 'Lan', 'cook', 'com_tam_suon', 'com_tam');
    cook.wageOwed = 360_000;
    w.money = 0;
    settling(w);
    const lease = sellableStations(w, 'com_tam').find((x) => x.instanceId === 'mat_bang');
    expect(lease?.refund).toBe(Math.round(0.5 * (8_000_000 + 1_500_000)));
    expect(sellableStations(w, 'banh_mi').some((x) => x.instanceId === 'mat_bang')).toBe(false);
    const due = w.settlement!.totalDue;
    expect(sellStation(w, 'com_tam', 'mat_bang', 'b', w.settlement!.month)).toEqual({ ok: true });
    expect(w.shops.com_tam.owned).toBe(false);
    expect(w.shops.com_tam.staff).toEqual([]);
    expect(p.location).toBe('banh_mi');
    expect(p.carry).toEqual(['com']);
    // Lương còn nợ của nhân viên quán đã trả vẫn được trả trong kết toán.
    expect(w.settlement).toBeNull();
    expect(w.money).toBe(4_750_000 - due);
    expect(due).toBeGreaterThanOrEqual(360_000);
  });

  it('the bánh mì cart cannot be returned', () => {
    const w = createWorld('X', 1);
    settling(w);
    expect(returnShop(w, 'banh_mi', 'a')).toEqual({ ok: false, error: 'NOT_SELLABLE' });
  });
});
