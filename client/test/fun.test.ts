import { describe, expect, it } from 'vitest';
import type { DaySummary } from '@qnm/shared';
import { newspaper } from '../src/ui/daySummary';
import { questView } from '../src/ui/questPanel';

const day = (over: Partial<DaySummary> = {}): DaySummary => ({
  day: 3, revenue: 900_000, ingredientCost: 200_000, unlockSpend: 0, served: 60, lost: 2, wages: 0, wasted: 0, sold: {}, marketing: 0,
  commission: 0, onlineOrders: 0, onlineCancelled: 0, tips: 12_000, cleaned: 0, bestCombo: 4, operatingProfit: 700_000, stars: 4.1, ...over,
});

describe('day newspaper', () => {
  it('picks the most notable headline and awards the family', () => {
    expect(newspaper(day({ lost: 0 })).headline).toContain('Không một khách nào');
    expect(newspaper(day({ bestCombo: 12 })).headline).toContain('12 khách');
    expect(newspaper(day({ day: 10 })).headline).toContain('Tết Nguyên Đán');
    const n = newspaper(day({ players: [
      { name: 'Bố', placed: 40, served: 5, cleaned: 0, crates: 0 },
      { name: 'Mẹ', placed: 10, served: 50, cleaned: 0, crates: 0 },
    ] }));
    expect(n.awards).toEqual([
      { title: '🥖 Vua bê hàng', name: 'Bố', value: '40 món' },
      { title: '💵 Thu ngân thần tốc', name: 'Mẹ', value: '50 khách' },
    ]);
  });
});

describe('quest panel', () => {
  it('shows progress for open quests and marks done / failed ones', () => {
    const v = questView({
      fun: {
        quests: [
          { text: 'Phục vụ 40 khách', progress: 10, target: 40, reward: 300_000, done: false, failed: false, kind: 'serve' },
          { text: 'Doanh thu', progress: 500_000, target: 1_000_000, reward: 200_000, done: false, failed: false, kind: 'revenue' },
          { text: 'Không ai về', progress: 9, target: 14, reward: 400_000, done: false, failed: true, kind: 'no_lost' },
        ],
      },
    } as never);
    expect(v[0]).toMatchObject({ pct: 25, progress: '10/40', reward: '+300K', state: 'open' });
    expect(v[1].progress).toBe('500K/1.000K');
    expect(v[2].state).toBe('failed');
  });
});
