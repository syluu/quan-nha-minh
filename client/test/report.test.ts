import { describe, expect, it } from 'vitest';
import type { DaySummary, Report } from '@qnm/shared';
import { chartBars, reportRows, soldList } from '../src/ui/menu/format';

function day(n: number, revenue: number, profit: number): DaySummary {
  return {
    day: n, revenue, ingredientCost: 100_000, unlockSpend: 0, served: 10, lost: 1, wages: 300_000, wasted: 2000,
    sold: { banh_mi: 7, tra_da: 9 }, operatingProfit: profit, stars: 4.2,
  };
}

describe('reportRows', () => {
  it('lists today first, then past days newest to oldest, with K money', () => {
    const r: Report = { history: [day(1, 500_000, 100_000), day(2, 800_000, 400_000)], today: day(3, 50_000, -350_000) };
    const rows = reportRows(r);
    expect(rows.map((x) => x.day)).toEqual(['Hôm nay (ngày 3)', 'Ngày 2', 'Ngày 1']);
    expect(rows[1].cells).toEqual(['800K', '-100K', '-300K', '-2K', '400K', '0K', '10', '1', '★ 4,2']);
    expect(rows[0].cells[4]).toBe('-350K');
  });
});

describe('chartBars', () => {
  it('keeps the last 14 days including today, scaled to the largest value', () => {
    const history = Array.from({ length: 20 }, (_, i) => day(i + 1, (i + 1) * 100_000, 50_000));
    const bars = chartBars({ history, today: day(21, 1_000_000, -500_000) });
    expect(bars).toHaveLength(14);
    expect(bars[0].day).toBe(8);
    expect(bars.at(-1)!.day).toBe(21);
    expect(Math.max(...bars.map((b) => b.hRevenue))).toBe(1);
    expect(bars.at(-1)!.hProfit).toBeCloseTo(-0.25); // max = doanh thu ngày 20 = 2.000K
  });
});

describe('soldList', () => {
  it('names items and sorts by count', () => {
    expect(soldList(day(1, 0, 0))).toEqual([
      { name: 'Trà đá', count: 9 },
      { name: 'Bánh mì', count: 7 },
    ]);
  });
});
