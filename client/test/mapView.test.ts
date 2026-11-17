import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { hudText } from '../src/ui/hud';
import { mapView, sellableName, staffLabel, staffView, upgradeView } from '../src/ui/menu/views';

function snap(over: Partial<Snapshot> = {}): Snapshot {
  const st = (instanceId: string, unlocked: boolean, seats: Snapshot['stations'][number]['seats'] = [], enabled = true) => ({
    instanceId, unlocked, outputCount: 0, stock: 0, inputs: {}, enabled, seats, blocked: null, level: 0,
  });
  return {
    shopId: 'com_tam',
    shops: [
      { id: 'banh_mi', name: 'Xe bánh mì', kind: 'shop', owned: true, complete: true, deposit: 0, rentPerMonth: 0 },
      { id: 'com_tam', name: 'Quán cơm tấm', kind: 'shop', owned: true, complete: false, deposit: 8_000_000, rentPerMonth: 4_000_000 },
      { id: 'pho_cafe', name: 'Quán phở & cà phê', kind: 'shop', owned: false, complete: false, deposit: 12_000_000, rentPerMonth: 6_000_000 },
    ],
    canRent: false,
    warehouse: {},
    day: 9, secOfDay: 0, money: 20_000_000, stars: 4, tiles: [], customers: [], log: [], prices: {},
    players: [
      { id: 'a', name: 'Bố', color: 0, x: 0, z: 0, dir: 0, carry: [], online: true, cap: 4, pick: 0, pickAt: null, carryLevel: 0, speedLevel: 0, location: 'com_tam', outfit: { hat: 'non_la', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' }, wardrobe: [] },
      { id: 'b', name: 'Mẹ', color: 0, x: 0, z: 0, dir: 0, carry: [], online: true, cap: 4, pick: 0, pickAt: null, carryLevel: 0, speedLevel: 0, location: 'banh_mi', outfit: { hat: 'non_la', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' }, wardrobe: [] },
    ],
    stations: [st('noi_com', true, [], false), st('ke_com_tam_suon', true), st('thu_ngan', true), st('ban_an_1', true, ['dirty', 'free'])],
    staff: [],
    month: 2, daysToMonthEnd: 5, campaigns: [], loans: [], maxLoan: 0, settlement: null, sellable: [],
    online: { registered: false, paused: false, vehicle: 'bike', pending: 0, shipper: null, ordersToday: 0, cancelledToday: 0 },
    ...over,
  };
}

describe('map tab (plan 5)', () => {
  it('lists owned shops (go to) and free places (rent) with the shop types menus', () => {
    const v = mapView(snap());
    expect(v.here).toBe('Quán cơm tấm');
    expect(v.owned.map((o) => [o.id, o.here])).toEqual([['banh_mi', false], ['com_tam', true]]);
    expect(v.free).toHaveLength(1);
    expect(v.free[0]).toMatchObject({ id: 'pho_cafe', deposit: '12.000K', rent: '6.000K/tháng', canRent: false });
    expect(v.free[0].menu).toContain('Phở bò');
    expect(v.hint).not.toBe('');
    expect(mapView(snap({ canRent: true })).free[0].canRent).toBe(true);
    expect(mapView(snap({ canRent: true, money: 1_000 })).free[0].canRent).toBe(false);
  });
});

describe('shop-aware menus (plan 5)', () => {
  it('staff tab offers a table cleaner once tables are open; machines show their on/off switch', () => {
    const v = staffView(snap());
    expect(v.shopName).toBe('Quán cơm tấm');
    expect(v.cleaner).toMatchObject({ name: null, canHire: true });
    expect(v.lines.map((l) => l.item)).toEqual(['com_tam_suon']);
    const u = upgradeView(snap(), 'a');
    expect(u.machines).toEqual([expect.objectContaining({ instanceId: 'noi_com', enabled: false })]);
    expect(staffLabel({ name: 'Hoa', role: 'cleaner', item: null })).toBe('Hoa · dọn bàn');
  });

  it('HUD shows the shop you are in and where the others are', () => {
    const t = hudText(snap(), 'a');
    expect(t.shop).toBe('🏠 Quán cơm tấm');
    expect(t.online).toBe('Bố, Mẹ (Xe bánh mì)');
  });

  it('names sell-list entries across shops, including returning a place', () => {
    expect(sellableName({ shopId: 'com_tam', instanceId: 'mat_bang' })).toBe('Trả mặt bằng Quán cơm tấm');
    expect(sellableName({ shopId: 'banh_mi', instanceId: 'chao_op_la' })).toBe('Chảo ốp la (Xe bánh mì)');
  });
});

describe('farm in the client (plan 6)', () => {
  const farmShops: Snapshot['shops'] = [
    { id: 'banh_mi', name: 'Xe bánh mì', kind: 'shop', owned: true, complete: false, deposit: 0, rentPerMonth: 0 },
    { id: 'farm', name: 'Trang trại', kind: 'farm', owned: false, complete: false, deposit: 5_000_000, rentPerMonth: 1_500_000 },
  ];
  it('the farm can be rented before the shops are complete; the warehouse is listed', () => {
    const v = mapView(snap({ shopId: 'banh_mi', shops: farmShops, canRent: false, warehouse: { rau: 12, gao: 0, trung: 10 } }));
    const farm = v.free.find((f) => f.id === 'farm')!;
    expect(farm).toMatchObject({ farm: true, canRent: true, deposit: '5.000K' });
    expect(farm.menu).toContain('Chuồng bò');
    expect(v.warehouse).toBe('12 rau, 10 trứng');
  });

  it('staff tab at the farm offers farmhands only; HUD hides stars there', () => {
    const s = snap({ shopId: 'farm', shops: farmShops, stations: [], staff: [] });
    const v = staffView(s);
    expect(v.farm).toEqual({ hands: [], canHire: true });
    expect(hudText(s, 'a').stars).toBe('★ —');
    expect(staffLabel({ name: 'Nam', role: 'farmhand', item: null })).toBe('Nam · trang trại');
  });
});

describe('costume tab (plan 7)', () => {
  it('shows wearing / owned / buy per slot, with affordability', async () => {
    const { costumeView } = await import('../src/ui/menu/views');
    const s = snap({ money: 1_000_000 });
    s.players[0].outfit = { hat: 'mu_dau_bep', shirt: 'ao_mac_dinh', pants: 'quan_nau', apron: 'khong_tap_de' };
    s.players[0].wardrobe = ['mu_dau_bep'];
    const v = costumeView(s, 'a');
    expect(v.map((x) => x.title)).toEqual(['Mũ', 'Áo', 'Quần', 'Tạp dề']);
    const hats = v[0].items;
    expect(hats.find((h) => h.id === 'mu_dau_bep')!.state).toBe('wearing');
    expect(hats.find((h) => h.id === 'non_la')).toMatchObject({ state: 'owned', price: 'Miễn phí' });
    expect(hats.find((h) => h.id === 'mu_phot')).toMatchObject({ state: 'buy', affordable: false });
    expect(hats.find((h) => h.id === 'mu_luoi_trai_do')).toMatchObject({ state: 'buy', affordable: true, price: '300K' });
  });
});
