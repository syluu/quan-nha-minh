// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { SimEvent, Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { createSettlementModal } from '../src/ui/settlementModal';

function fakeConn() {
  const snaps: ((s: Snapshot) => void)[] = [];
  const evs: ((e: SimEvent) => void)[] = [];
  const sold: string[] = [];
  const loans: [number, number][] = [];
  return {
    conn: {
      onSnapshot: (cb: (s: Snapshot) => void) => snaps.push(cb),
      onEvent: (cb: (e: SimEvent) => void) => evs.push(cb),
      sellStation: (id: string) => sold.push(id),
      takeLoan: (a: number, m: number) => loans.push([a, m]),
    } as never,
    snap: (s: Snapshot) => snaps.forEach((cb) => cb(s)),
    event: (e: SimEvent) => evs.forEach((cb) => cb(e)),
    sold, loans,
  };
}

const settlement = { month: 1, revenue: 900_000, ingredientCost: 400_000, marketing: 0, wages: 1_680_000, rent: 0, loanDue: 0, totalDue: 1_680_000 };
const base = (over: Partial<Snapshot>): Snapshot => ({
  day: 8, secOfDay: 0, money: 1_000_000, stars: 3, tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [], ...V3, ...over,
});

describe('settlement modal', () => {
  it('blocks with the shortfall, offers a loan and machines to sell, then closes when paid', () => {
    document.body.innerHTML = '<div id="ui"></div>';
    const f = fakeConn();
    const inputs: boolean[] = [];
    createSettlementModal(document.getElementById('ui')!, f.conn, (on) => inputs.push(on));
    f.snap(base({ settlement, sellable: [{ instanceId: 'chao_op_la', refund: 400_000 }], maxLoan: 2_000_000 }));
    const box = document.querySelector('.settle') as HTMLElement;
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('Kết toán tháng 1');
    expect(box.textContent).toContain('Còn thiếu: 680K');
    expect(inputs.at(-1)).toBe(false);
    (box.querySelector('[data-sell]') as HTMLButtonElement).click();
    expect(f.sold).toEqual(['chao_op_la']);
    const range = box.querySelector('.loan-form input') as HTMLInputElement;
    expect(range.value).toBe('700000'); // gợi ý = số còn thiếu làm tròn lên 100K
    (box.querySelector('.loan-form button') as HTMLButtonElement).click();
    expect(f.loans).toEqual([[700_000, 1]]);
    f.snap(base({ settlement: null, money: 20_000 }));
    f.event({ type: 'monthClosed', month: 1 });
    expect(box.textContent).toContain('Đã trả xong tháng 1');
    (box.querySelector('.close') as HTMLButtonElement).click();
    expect(box.hidden).toBe(true);
    expect(inputs.at(-1)).toBe(true);
  });
});
