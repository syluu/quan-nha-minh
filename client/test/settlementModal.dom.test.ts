// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { SimEvent, Snapshot } from '@qnm/shared';
import { V3 } from './fixtures';
import { createSettlementModal } from '../src/ui/settlementModal';

function fakeConn() {
  const snaps: ((s: Snapshot) => void)[] = [];
  const evs: ((e: SimEvent) => void)[] = [];
  const sold: string[] = [];
  const loans: [number, number, number | undefined][] = [];
  return {
    conn: {
      onSnapshot: (cb: (s: Snapshot) => void) => snaps.push(cb),
      onEvent: (cb: (e: SimEvent) => void) => evs.push(cb),
      sellStation: (id: string, forMonth?: number) => sold.push(`${id}@${forMonth}`),
      takeLoan: (a: number, m: number, forMonth?: number) => loans.push([a, m, forMonth]),
    } as never,
    snap: (s: Snapshot) => snaps.forEach((cb) => cb(s)),
    event: (e: SimEvent) => evs.forEach((cb) => cb(e)),
    sold, loans,
  };
}

const settlement = { month: 1, revenue: 900_000, ingredientCost: 400_000, marketing: 0, commission: 0, wages: 1_680_000, rent: 0, loanDue: 0, totalDue: 1_680_000 };
const base = (over: Partial<Snapshot>): Snapshot => ({
  shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, day: 8, secOfDay: 0, money: 1_000_000, stars: 3, tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [], ...V3, ...over,
});

describe('settlement modal', () => {
  it('blocks with the shortfall, offers a loan and machines to sell, then closes when paid', () => {
    document.body.innerHTML = '<div id="ui"></div>';
    const f = fakeConn();
    const blocked: boolean[] = [];
    createSettlementModal(document.getElementById('ui')!, f.conn, (b) => blocked.push(b));
    f.snap(base({ settlement, sellable: [{ shopId: 'banh_mi', instanceId: 'chao_op_la', refund: 400_000 }], maxLoan: 2_000_000 }));
    const box = document.querySelector('.settle') as HTMLElement;
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('Kết toán tháng 1');
    expect(box.textContent).toContain('Còn thiếu: 680K');
    expect(blocked.at(-1)).toBe(true);
    (box.querySelector('[data-sell]') as HTMLButtonElement).click(); // hỏi lại trước khi bán
    expect(f.sold).toEqual([]);
    (box.querySelector('[data-sell-yes]') as HTMLButtonElement).click();
    expect(f.sold).toEqual(['chao_op_la@1']);
    const range = box.querySelector('.loan-form input') as HTMLInputElement;
    expect(range.value).toBe('700000'); // gợi ý = số còn thiếu làm tròn lên 100K
    const vay = box.querySelector('.loan-form button') as HTMLButtonElement;
    vay.click();
    vay.click(); // bấm 2 lần: chỉ gửi 1 lần
    expect(f.loans).toEqual([[700_000, 1, 1]]);
    expect(vay.disabled).toBe(true);
    f.snap(base({ settlement: null, money: 20_000 }));
    f.event({ type: 'monthClosed', month: 1 });
    expect(box.textContent).toContain('Đã trả xong tháng 1');
    expect(blocked.at(-1)).toBe(false); // thông báo không khoá di chuyển (M3)
    (box.querySelector('.close') as HTMLButtonElement).click();
    expect(box.hidden).toBe(true);
    expect(blocked.at(-1)).toBe(false);
  });
});
