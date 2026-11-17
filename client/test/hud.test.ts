import { describe, expect, it } from 'vitest';
import type { DaySummary, Snapshot } from '@qnm/shared';
import { carryBadge, hudText } from '../src/ui/hud';
import { summaryRows } from '../src/ui/daySummary';

describe('hudText', () => {
  it('formats money, clock, stars and who is online', () => {
    const s: Snapshot = {
      day: 1, secOfDay: 33.75, money: 2_987_500, stars: 3.7, stations: [], tiles: [], customers: [], log: [], staff: [], prices: {},
      players: [
        { id: 'a', name: 'Bố', color: 0, x: 0, z: 0, dir: 0, carry: ['banh_mi', 'banh_mi', 'tra_da'], online: true, cap: 4, pick: 0, pickAt: null },
        { id: 'b', name: 'Mẹ', color: 0, x: 0, z: 0, dir: 0, carry: [], online: true, cap: 4, pick: 0, pickAt: null },
        { id: 'c', name: 'Con', color: 0, x: 0, z: 0, dir: 0, carry: [], online: false, cap: 4, pick: 0, pickAt: null },
      ],
    };
    expect(hudText(s, 'a')).toEqual({ money: '💰 2.987,5K', clock: 'Ngày 1 · 07:30', stars: '★ 3,7', online: 'Bố, Mẹ', basket: '🧺 3/4' });
  });
});

describe('carryBadge', () => {
  it('shows count/cap and flags a full stack', () => {
    expect(carryBadge(3, 4)).toEqual({ text: '3/4', full: false });
    expect(carryBadge(4, 4)).toEqual({ text: '4/4', full: true });
    expect(carryBadge(0, 4)).toEqual({ text: '', full: false });
  });
});

describe('summaryRows', () => {
  it('lists the day results in Vietnamese with K money', () => {
    const d: DaySummary = {
      day: 1, revenue: 1_250_000, ingredientCost: 480_000, unlockSpend: 800_000, served: 86, lost: 4, wages: 0, wasted: 0, sold: {},
      operatingProfit: 770_000, stars: 4.2,
    };
    expect(summaryRows(d)).toEqual([
      ['Doanh thu', '1.250K'],
      ['Tiền nguyên liệu', '-480K'],
      ['Lãi hoạt động', '770K'],
      ['Chi mở rộng', '-800K'],
      ['Khách đã phục vụ', '86'],
      ['Khách bỏ về', '4'],
      ['Đánh giá', '★ 4,2'],
    ]);
  });
});
