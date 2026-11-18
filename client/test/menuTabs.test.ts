import { describe, expect, it } from 'vitest';
import { V3 } from './fixtures';
import type { Snapshot } from '@qnm/shared';
import { actionErrorText, priceView, staffView } from '../src/ui/menu/views';

function snap(): Snapshot {
  const st = (instanceId: string, unlocked: boolean) => ({ instanceId, unlocked, outputCount: 0, stock: 0, inputs: {}, enabled: true, seats: [], blocked: null, level: 0 });
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, fun: { combo: 0, cat: 'none', catSpot: { x: 0, z: 0 }, tourBus: false, weather: 'sun', festival: null, quests: [], badges: [], today: [] }, day: 1, secOfDay: 0, money: 0, stars: 3, tiles: [], customers: [], log: [],
    players: [],
    stations: [st('lo_banh_mi', true), st('ke_banh_mi', true), st('thu_ngan', true), st('ke_tra_da', false), st('ke_bm_trung', true)],
    staff: [{ id: 's1', name: 'Lan', role: 'cashier', item: null, x: 0, z: 0, dir: 0, carry: [], level: 1, wageOwed: 0 }],
    prices: { banh_mi: 6000 },
    ...V3,
  };
}

describe('staffView', () => {
  it('shows the cashier slot and general cooks (up to one per open shelf)', () => {
    const v = staffView(snap());
    expect(v.cashier).toMatchObject({ name: 'Lan', staffId: 's1', canHire: false });
    expect(v.cooks).toEqual({ list: [], max: 2, canHire: true });
    expect(v.wagePerDay).toBe('120K');
  });
});

describe('priceView', () => {
  it('lists open items with market and current price and the allowed range', () => {
    const v = priceView(snap());
    expect(v.map((x) => x.item)).toEqual(['banh_mi', 'banh_mi_trung']);
    expect(v[0]).toEqual({ item: 'banh_mi', name: 'Bánh mì', current: '6K', market: '5K', base: 5000, min: 2500, max: 10000, value: 6000 });
    expect(v[1].value).toBe(15000);
  });
});

describe('actionErrorText', () => {
  it('translates server errors', () => {
    expect(actionErrorText('NO_SLOT')).toBe('Đã đủ người cho việc này');
    expect(actionErrorText('LINE_TAKEN')).toBe('Món này đã có người phụ trách');
    expect(actionErrorText('BAD_ITEM')).toBe('Món này chưa bán');
    expect(actionErrorText('NOT_FOUND')).toBe('Không tìm thấy');
    expect(actionErrorText('NO_MONEY')).toBe('Không đủ tiền');
    expect(actionErrorText('PAUSED')).toBe('Đang kết toán cuối tháng — trả xong rồi mới mua được');
    expect(actionErrorText('NO_SETTLEMENT')).toBe('Tháng này đã kết toán xong');
    expect(actionErrorText('???')).toBe('Không thực hiện được');
  });
});
