import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { bankView, loanPreview, marketingView } from '../src/ui/menu/views';

function snap(): Snapshot {
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, fun: { combo: 0, cat: 'none', catSpot: { x: 0, z: 0 }, tourBus: false, busSpot: { x: 0, z: 0 }, weather: 'sun', festival: null, quests: [], badges: [], today: [] }, day: 3, secOfDay: 0, money: 0, stars: 3.3, tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [],
    ...V3,
    daysToMonthEnd: 5,
    campaigns: [{ id: 'mxh', daysLeft: 2 }],
    loans: [{ id: 'L1', principal: 1_000_000, remaining: 1_090_000, installment: 545_000, monthsLeft: 2 }],
    maxLoan: 900_000,
  };
}

describe('loanPreview', () => {
  it('matches the server formula', () => {
    expect(loanPreview(1_000_000, 2)).toEqual({ total: 1_090_000, installment: 545_000 });
    expect(loanPreview(500_000, 1)).toEqual({ total: 525_000, installment: 525_000 });
  });
});

describe('marketingView', () => {
  it('lists short campaigns (with run/extend state), long-term ads and both multipliers', () => {
    const v = marketingView(snap());
    const byId = Object.fromEntries(v.cards.map((c) => [c.id, c]));
    expect(byId.to_roi).toMatchObject({ cost: '200K', effect: '+20% khách', days: '1 ngày', running: 0 });
    expect(byId.mxh).toMatchObject({ cost: '1.000K', effect: '+50% khách · +30% đơn online', running: 2 });
    expect(byId.review.effect).toBe('+100% khách · +30% đơn online · +0,3 sao');
    expect(byId.kol.icon).toBe('🌟');
    expect(v.perm.find((a) => a.id === 'bien_led')).toMatchObject({ owned: false, effect: '+15% khách (lâu dài)' });
    expect(v.running).toEqual([{ name: 'Quảng cáo mạng xã hội', daysLeft: 2 }]);
    expect(v.multiplier).toBe('×1,5');
    expect(v.onlineMultiplier).toBe('×1,3');
  });
});

describe('bankView', () => {
  it('summarises debt, limit and days to settlement', () => {
    const v = bankView(snap());
    expect(v.loans).toEqual([{ id: 'L1', principal: '1.000K', remaining: '1.090K', installment: '545K', monthsLeft: 2 }]);
    expect(v.maxLoan).toBe('900K');
    expect(v.maxLoanValue).toBe(900_000);
    expect(v.daysToMonthEnd).toBe(5);
  });
});
