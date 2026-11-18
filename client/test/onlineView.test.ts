import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { onlineView, staffView, upgradeView } from '../src/ui/menu/views';

function snap(registered: boolean): Snapshot {
  const st = (instanceId: string, unlocked: boolean, level = 0) => ({ instanceId, unlocked, outputCount: 0, stock: 0, inputs: {}, enabled: true, seats: [], blocked: null, level });
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, fun: { combo: 0, cat: 'none', catSpot: { x: 0, z: 0 }, tourBus: false, busSpot: { x: 0, z: 0 }, weather: 'sun', festival: null, quests: [], badges: [], today: [] }, life: { tier: 0, earned: 0, nextTierAt: null, regulars: [], party: null }, day: 1, secOfDay: 0, money: 0, stars: 3, tiles: [], customers: [], log: [], prices: {}, players: [], ...V3,
    stations: [st('lo_banh_mi', true), st('ke_banh_mi', true), st('thu_ngan', true), st('diem_giao', registered)],
    staff: registered ? [{ id: 's9', name: 'Mai', role: 'courier', item: null, x: 0, z: 0, dir: 0, carry: [], level: 1, wageOwed: 0, energy: 100, cheer: false, rest: 0, tireless: false }] : [],
    online: { registered, paused: false, vehicle: 'bike', pending: 2, shipper: null, ordersToday: 7, cancelledToday: 1 },
  };
}

describe('onlineView', () => {
  it('explains how to register when not yet open', () => {
    expect(onlineView(snap(false))).toMatchObject({ registered: false, hint: 'Mở ô "Điểm giao hàng" (2.000K) ở cuối lối bếp bên phải để bắt đầu nhận đơn.' });
  });
  it('shows status and today\'s numbers when open', () => {
    expect(onlineView(snap(true))).toEqual({
      registered: true, paused: false, status: 'Đang nhận đơn', vehicle: 'Xe máy (1 đơn/lần)', pending: 2, ordersToday: 7, cancelledToday: 1, commission: '20%', hint: '',
    });
  });
});

describe('courier and pickup in menus', () => {
  it('staff tab lists the courier once registered', () => {
    expect(staffView(snap(false)).courier).toBeNull();
    expect(staffView(snap(true)).courier).toMatchObject({ name: 'Mai', staffId: 's9', canHire: false });
  });
  it('upgrade tab offers the car pick-up for 5.000K', () => {
    expect(upgradeView(snap(false), 'x').pickup).toBeNull();
    expect(upgradeView(snap(true), 'x').pickup).toEqual({ vehicle: 'Xe máy', cost: '5.000K' });
  });
});

describe('staff label over the head (C1)', async () => {
  const { staffLabel } = await import('../src/ui/menu/views');
  it('names every role, including the courier (item null)', () => {
    expect(staffLabel({ name: 'Lan', role: 'cashier', item: null })).toBe('Lan · thu ngân');
    expect(staffLabel({ name: 'Mai', role: 'courier', item: null })).toBe('Mai · giao đơn');
    expect(staffLabel({ name: 'Hùng', role: 'cook', item: 'banh_mi' })).toBe('Hùng · Bánh mì');
  });
});
