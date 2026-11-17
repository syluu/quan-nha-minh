import { describe, expect, it } from 'vitest';
import type { Settlement } from '@qnm/shared';
import { settlementRows, shortfall, suggestedLoan } from '../src/ui/settlementModal';

const st: Settlement = { month: 2, revenue: 3_200_000, ingredientCost: 1_100_000, marketing: 200_000, wages: 1_680_000, rent: 0, loanDue: 545_000, totalDue: 2_225_000 };

describe('settlement modal helpers', () => {
  it('lists the month in Vietnamese with K money', () => {
    expect(settlementRows(st)).toEqual([
      ['Doanh thu', '3.200K'],
      ['Nguyên liệu (đã chi)', '-1.100K'],
      ['Quảng cáo (đã chi)', '-200K'],
      ['Lương nhân viên', '-1.680K'],
      ['Thuê mặt bằng', '0K'],
      ['Góp nợ ngân hàng', '-545K'],
      ['Tổng phải trả', '2.225K'],
    ]);
  });
  it('computes the shortfall and a loan suggestion rounded up to 100K (min 500K)', () => {
    expect(shortfall(2_000_000, st)).toBe(225_000);
    expect(shortfall(3_000_000, st)).toBe(0);
    expect(suggestedLoan(225_000)).toBe(500_000);
    expect(suggestedLoan(1_234_000)).toBe(1_300_000);
  });
});
