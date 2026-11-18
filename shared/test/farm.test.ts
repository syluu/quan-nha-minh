import { describe, expect, it } from 'vitest';
import { SHOPS, getPlaced } from '../src/content';
import { tickCarry } from '../src/sim/carry';
import { tickStations } from '../src/sim/production';
import { normalizeLoaded } from '../src/sim/snapshot';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

function farmWorld() {
  const w = createWorld('X', 1);
  w.shops.farm.owned = true;
  return w;
}

describe('warehouse (plan 6, Review Focus 1)', () => {
  it('a machine takes ingredients from the warehouse for free when there are enough', () => {
    const w = createWorld('X', 1);
    w.warehouse.bot_mi = 3;
    tickStations(w, 'banh_mi', 0.1);
    expect(w.money).toBe(5_000_000);
    expect(w.warehouse.bot_mi).toBe(2);
    expect(w.dayStats.ingredientCost).toBe(0);
  });

  it('pays the market only for what is missing; the warehouse never goes negative', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    // Chảo chả trứng cần 1 trứng + 1 thịt lợn: kho có trứng, thiếu thịt.
    w.shops.com_tam.stations.chao_cha.unlocked = true;
    for (const id of ['noi_com', 'lo_suon', 'ban_com_tam_suon']) w.shops.com_tam.stations[id].enabled = false;
    w.warehouse = { trung: 1 };
    tickStations(w, 'com_tam', 0.1);
    expect(w.money).toBe(5_000_000 - 6_000);
    expect(w.warehouse.trung).toBe(0);
    for (let i = 0; i < 5; i++) repeat(5.1, (dt) => tickStations(w, 'com_tam', dt));
    expect(w.warehouse.trung).toBe(0);
    expect(w.shops.com_tam.stations.chao_cha.outputCount).toBeGreaterThan(1);
  });
});

describe('farm plots and the truck', () => {
  it('a plot charges the seed cost per batch and yields one crate after its cycle', () => {
    const w = farmWorld();
    const st = w.shops.farm.stations.ruong_rau;
    tickStations(w, 'farm', 0.1);
    expect(w.money).toBe(5_000_000 - 4_000);
    repeat(40, (dt) => tickStations(w, 'farm', dt));
    expect(st.outputCount).toBe(1);
  });

  it('a player picks a crate at the plot and loading it on the truck fills the warehouse', () => {
    const w = farmWorld();
    w.shops.farm.stations.ruong_rau.outputCount = 2;
    const plot = getPlaced('farm', 'ruong_rau').workPoint;
    const p = putPlayer(w, 'a', plot.x, plot.z, [], 'farm');
    repeat(1, (dt) => tickCarry(w, 'farm', dt));
    expect(p.carry).toEqual(['thung_rau', 'thung_rau']);
    const truck = getPlaced('farm', 'xe_cho_hang').workPoint;
    Object.assign(p, truck);
    p.carry.push('banh_mi'); // món không phải thùng hàng: không bốc lên xe
    repeat(1, (dt) => tickCarry(w, 'farm', dt));
    expect(p.carry).toEqual(['banh_mi']);
    expect(w.warehouse.rau).toBe(40);
  });
});

describe('save v5 → v6 (Review Focus 4)', () => {
  it('adds an unrented farm and an empty warehouse', () => {
    const w = normalizeLoaded(JSON.parse(JSON.stringify(createWorld('ABC-DEF', 1))));
    const raw = JSON.parse(JSON.stringify(w));
    raw.schemaVersion = 5;
    delete raw.warehouse;
    delete raw.shops.farm;
    const loaded = normalizeLoaded(raw);
    expect(loaded.schemaVersion).toBe(9);
    expect(loaded.shops.farm.owned).toBe(false);
    expect(loaded.warehouse).toEqual({});
  });
});

describe('renting the farm (plan 6, Review Focus 2)', () => {
  it('can be rented any time with enough money, and does not block renting shops', async () => {
    const { canRent, rentShop } = await import('../src/sim/shops');
    const w = createWorld('X', 1);
    putPlayer(w, 'a', 0, 2);
    w.money = 4_999_000;
    expect(rentShop(w, 'farm', 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
    w.day = 7;
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 0, loanDue: 0, totalDue: 1 };
    w.money = 6_000_000;
    expect(rentShop(w, 'farm', 'a')).toEqual({ ok: false, error: 'PAUSED' });
    expect(w.money).toBe(6_000_000);
    w.settlement = null;
    expect(rentShop(w, 'farm', 'a')).toEqual({ ok: true });
    expect(w.money).toBe(1_000_000);
    expect(w.players.a.location).toBe('farm');
    // Trang trại chưa mở hết lô vẫn không chặn thuê quán mới.
    for (const st of Object.values(w.shops.banh_mi.stations)) st.unlocked = true;
    expect(canRent(w)).toBe(true);
  });

  it('farm rent + 300K for each extra plot goes into the settlement', async () => {
    const { buildSettlement } = await import('../src/sim/settlement');
    const w = farmWorld();
    w.shops.farm.rentedDay = 1;
    w.shops.farm.stations.ruong_lua_mi.unlocked = true;
    w.shops.farm.stations.chuong_ga.unlocked = true;
    w.day = 7;
    expect(buildSettlement(w).rent).toBe(700_000 + 2 * 150_000);
  });
});

describe('farm runs without shop systems (Review Focus 3)', () => {
  it('no customers, no orders, campaigns and cashiers refused, stars only from shops', async () => {
    const { tick } = await import('../src/sim/tick');
    const { runCampaign } = await import('../src/sim/marketing');
    const { hireStaff } = await import('../src/sim/staff');
    const { averageStars } = await import('../src/sim/rating');
    const w = farmWorld();
    putPlayer(w, 'a', 0, -1.25, [], 'farm');
    repeat(30, (dt) => tick(w, dt), 0.25);
    expect(w.shops.farm.customers).toEqual([]);
    expect(w.shops.farm.orders).toEqual([]);
    expect(runCampaign(w, 'farm', 'to_roi', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(hireStaff(w, 'farm', 'cashier', null, 'a')).toEqual({ ok: false, error: 'BAD_ROLE' });
    expect(hireStaff(w, 'banh_mi', 'farmhand', null, 'a')).toEqual({ ok: false, error: 'BAD_ROLE' });
    w.shops.farm.ratings = [1, 1, 1];
    w.shops.banh_mi.ratings = [5];
    expect(averageStars(w)).toBe(5);
  });

  it('farmhands (max 2) carry crates from plots to the truck', async () => {
    const { hireStaff, tickStaff } = await import('../src/sim/staff');
    const w = farmWorld();
    putPlayer(w, 'a', 0, -1.25, [], 'farm');
    expect(hireStaff(w, 'farm', 'farmhand', null, 'a')).toEqual({ ok: true });
    expect(hireStaff(w, 'farm', 'farmhand', null, 'a')).toEqual({ ok: true });
    expect(hireStaff(w, 'farm', 'farmhand', null, 'a')).toEqual({ ok: false, error: 'NO_SLOT' });
    w.shops.farm.stations.ruong_rau.outputCount = 3;
    w.shops.farm.stations.chuong_ga.unlocked = true;
    w.shops.farm.stations.chuong_ga.outputCount = 2;
    repeat(30, (dt) => tickStaff(w, 'farm', dt));
    expect(w.warehouse.rau).toBe(60);
    expect(w.warehouse.trung).toBe(30);
  });
});

describe('delivery fee and returning the farm', () => {
  it('end of day: 50K for each shop that used warehouse stock today; unused stock costs nothing; never drains the wallet', async () => {
    const { advanceTime } = await import('../src/sim/time');
    const w = farmWorld();
    w.shops.com_tam.owned = true;
    w.warehouse = { xuong_bo: 6 }; // không quán nào dùng
    w.secOfDay = 359.99;
    advanceTime(w, 0.1);
    expect(w.money).toBe(5_000_000);
    w.warehouse = { bot_mi: 5, gao: 5 };
    tickStations(w, 'banh_mi', 0.05);
    tickStations(w, 'com_tam', 0.05);
    const before = w.money;
    const costBefore = w.dayStats.ingredientCost; // lò sườn mua thịt ở chợ (kho không có)
    w.secOfDay = 359.99;
    const summary = advanceTime(w, 0.1)!;
    expect(before - w.money).toBe(100_000);
    expect(summary.ingredientCost - costBefore).toBe(100_000);
    w.warehouse = { bot_mi: 5 };
    tickStations(w, 'banh_mi', 3.1);
    tickStations(w, 'banh_mi', 0.05);
    w.money = 30_000;
    w.secOfDay = 359.99;
    advanceTime(w, 0.1);
    expect(w.money).toBe(30_000);
  });

  it('two farmhands go to different plots; returning the farm keeps the crates they carry', async () => {
    const { hireStaff, tickStaff } = await import('../src/sim/staff');
    const { sellStation } = await import('../src/sim/settlement');
    const w = farmWorld();
    putPlayer(w, 'a', 0, -1.25, [], 'banh_mi');
    hireStaff(w, 'farm', 'farmhand', null, 'a');
    hireStaff(w, 'farm', 'farmhand', null, 'a');
    w.shops.farm.stations.chuong_ga.unlocked = true;
    w.shops.farm.stations.ruong_rau.outputCount = 1;
    w.shops.farm.stations.chuong_ga.outputCount = 1;
    tickStaff(w, 'farm', 0.05);
    const [a, b] = w.shops.farm.staff;
    expect(a.task!.from).not.toBe(b.task!.from);
    b.carry = ['thung_thit_bo'];
    w.money = 0;
    w.day = 7;
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 1e12, loanDue: 0, totalDue: 1e12 };
    expect(sellStation(w, 'farm', 'mat_bang', 'a', 1)).toEqual({ ok: true });
    expect(w.warehouse).toMatchObject({ thit_bo: 8, xuong_bo: 8 });
  });

  it('returning the farm sends people home and keeps the warehouse (Review Focus 5)', async () => {
    const { sellStation } = await import('../src/sim/settlement');
    const w = farmWorld();
    const p = putPlayer(w, 'a', 0, -1.25, ['thung_rau'], 'farm');
    w.warehouse.gao = 7;
    w.money = 0;
    w.day = 7;
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 1e12, loanDue: 0, totalDue: 1e12 };
    expect(sellStation(w, 'farm', 'mat_bang', 'a', 1)).toEqual({ ok: true });
    expect(w.shops.farm.owned).toBe(false);
    expect(p.location).toBe('banh_mi');
    expect(w.warehouse.gao).toBe(7);
    expect(w.money).toBe(2_500_000);
  });
});

describe('expanding the farm and choosing what to grow (owner request)', () => {
  it('each expansion adds 4 empty slots on the left; 3 expansions max; costs rise', async () => {
    const { buyFarmExpansion } = await import('../src/sim/farm');
    const w = farmWorld();
    w.money = 20_000_000;
    putPlayer(w, 'a', 0, -1.25, [], 'farm');
    const slots = (lv: number) => SHOPS.farm.stations.filter((p) => p.farmExpansion === lv).map((p) => w.shops.farm.stations[p.instanceId]);
    expect(slots(1).every((s) => !s.unlocked)).toBe(true);
    expect(buyFarmExpansion(w, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(17_000_000);
    expect(slots(1).every((s) => s.unlocked && s.crop === null)).toBe(true);
    expect(slots(2).every((s) => !s.unlocked)).toBe(true);
    buyFarmExpansion(w, 'a');
    buyFarmExpansion(w, 'a');
    expect(w.money).toBe(20_000_000 - 3_000_000 - 5_000_000 - 8_000_000);
    expect(buyFarmExpansion(w, 'a')).toEqual({ ok: false, error: 'MAXED' });
    expect(w.shops.farm.farmLevel).toBe(3);
  });

  it('refuses without money, during settlement, or without a farm', async () => {
    const { buyFarmExpansion } = await import('../src/sim/farm');
    const w = createWorld('X', 1);
    expect(buyFarmExpansion(w, 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
    w.shops.farm.owned = true;
    w.money = 2_999_000;
    expect(buyFarmExpansion(w, 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
    w.money = 9_000_000;
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 0, loanDue: 0, totalDue: 1 };
    expect(buyFarmExpansion(w, 'a')).toEqual({ ok: false, error: 'PAUSED' });
    expect(w.money).toBe(9_000_000);
  });

  it('an empty slot does nothing until a crop is chosen; then it grows that crop', async () => {
    const { buyFarmExpansion, setPlotCrop } = await import('../src/sim/farm');
    const w = farmWorld();
    w.money = 10_000_000;
    buyFarmExpansion(w, 'a');
    for (const id of Object.keys(w.shops.farm.stations)) if (!id.startsWith('lo_mo_rong_1')) w.shops.farm.stations[id].enabled = false;
    tickStations(w, 'farm', 0.1);
    expect(w.money).toBe(7_000_000); // đất trống: không tốn tiền giống
    expect(setPlotCrop(w, 'lo_mo_rong_1', 'chuong_bo', 'a')).toEqual({ ok: true });
    tickStations(w, 'farm', 0.1);
    expect(w.money).toBe(7_000_000 - 45_000);
    repeat(120, (dt) => tickStations(w, 'farm', dt));
    // Nhặt ra thùng thịt bò, không phải thùng rau (giống mặc định của ô).
    const wp = getPlaced('farm', 'lo_mo_rong_1').workPoint;
    const p = putPlayer(w, 'b', wp.x, wp.z, [], 'farm');
    repeat(0.5, (dt) => tickCarry(w, 'farm', dt));
    expect(p.carry).toEqual(['thung_thit_bo']);
  });

  it('switching crop waits for the current batch and for the crates to be collected; same crop cancels', async () => {
    const { setPlotCrop } = await import('../src/sim/farm');
    const w = farmWorld();
    const st = w.shops.farm.stations.ruong_rau;
    tickStations(w, 'farm', 0.1); // đang trồng rau
    expect(setPlotCrop(w, 'ruong_rau', 'chuong_ga', 'a')).toEqual({ ok: true });
    expect(st.nextCrop).toBe('chuong_ga');
    repeat(40, (dt) => tickStations(w, 'farm', dt));
    expect(st.outputCount).toBe(1); // mẻ rau xong
    expect(st.crop ?? 'ruong_rau').toBe('ruong_rau'); // còn thùng rau trên lô → chưa đổi
    st.outputCount = 0;
    tickStations(w, 'farm', 0.1);
    expect(st.crop).toBe('chuong_ga');
    expect(setPlotCrop(w, 'ruong_rau', 'ruong_rau', 'a')).toEqual({ ok: true });
    expect(st.nextCrop).toBe('ruong_rau');
    expect(setPlotCrop(w, 'ruong_rau', 'chuong_ga', 'a')).toEqual({ ok: true });
    expect(st.nextCrop).toBeNull();
    expect(setPlotCrop(w, 'ruong_rau', 'banh_mi', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setPlotCrop(w, 'xe_cho_hang', 'chuong_ga', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setPlotCrop(w, 'lo_mo_rong_5', 'chuong_ga', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' }); // chưa mở rộng
  });

  it('expansion slots pay plot rent and count as assets; save v8 → v9 adds the level', async () => {
    const { buyFarmExpansion } = await import('../src/sim/farm');
    const { buildSettlement } = await import('../src/sim/settlement');
    const { assetValue } = await import('../src/sim/bank');
    const w = farmWorld();
    w.shops.farm.rentedDay = 1;
    w.money = 10_000_000;
    const before = assetValue(w);
    buyFarmExpansion(w, 'a');
    expect(assetValue(w)).toBe(before + 3_000_000);
    w.day = 7;
    expect(buildSettlement(w).rent).toBe(700_000 + 4 * 150_000);
    const raw = JSON.parse(JSON.stringify(createWorld('ABC-DEF', 1)));
    raw.schemaVersion = 8;
    delete raw.shops.farm.farmLevel;
    expect(normalizeLoaded(raw).shops.farm.farmLevel).toBe(0);
  });
});
