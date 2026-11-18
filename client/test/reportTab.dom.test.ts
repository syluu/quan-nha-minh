// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { DaySummary, Report } from '@qnm/shared';
import { reportTab } from '../src/ui/menu/reportTab';

function day(n: number, revenue: number): DaySummary {
  return {
    day: n, revenue, ingredientCost: 100_000, unlockSpend: 0, served: 10, lost: 1, wages: 300_000, wasted: 2000,
    sold: { banh_mi: 7 }, marketing: 0, commission: 0, onlineOrders: 0, onlineCancelled: 0, tips: 0, cleaned: 0, bestCombo: 0, operatingProfit: 0, stars: 4,
  };
}

describe('report tab', () => {
  it('refreshing every 2 seconds keeps the wide table scrolled where the player left it', () => {
    const cbs: ((r: Report) => void)[] = [];
    const conn = { onReport: (cb: (r: Report) => void) => (cbs.push(cb), () => {}), requestReport: () => {} } as never;
    const body = document.createElement('div');
    const stop = reportTab(conn).mount(body);
    const send = (r: Report) => cbs.forEach((cb) => cb(r));
    send({ history: [day(1, 500_000)], today: day(2, 50_000), months: [] });
    const wrap = body.querySelector('.table-wrap') as HTMLElement;
    wrap.scrollLeft = 300;
    send({ history: [day(1, 500_000)], today: day(2, 90_000), months: [] }); // số liệu mới → vẽ lại
    expect(body.textContent).toContain('90K');
    expect((body.querySelector('.table-wrap') as HTMLElement).scrollLeft).toBe(300);
    if (typeof stop === 'function') stop();
  });
});
