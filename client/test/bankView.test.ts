import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { bankView, loanPreview, marketingView } from '../src/ui/menu/views';

function snap(): Snapshot {
  return {
    day: 3, secOfDay: 0, money: 0, stars: 3.3, tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [],
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
  it('lists the three campaigns, what is running and the customer multiplier', () => {
    const v = marketingView(snap());
    expect(v.cards.map((c) => [c.id, c.cost, c.effect, c.days])).toEqual([
      ['to_roi', '200K', '+20% khách', '1 ngày'],
      ['mxh', '1.000K', '+50% khách', '3 ngày'],
      ['review', '5.000K', '+100% khách, +0,3 sao', '2 ngày'],
    ]);
    expect(v.running).toEqual([{ name: 'Quảng cáo mạng xã hội', daysLeft: 2 }]);
    expect(v.multiplier).toBe('×1,5');
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
