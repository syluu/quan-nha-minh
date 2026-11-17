import { describe, expect, it } from 'vitest';
import { assetValue, maxLoan, repayLoan, takeLoan } from '../src/sim/bank';
import { joinPlayer } from '../src/sim/players';
import { tick } from '../src/sim/tick';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';

function world(): WorldState {
  const w = createWorld('X', 1);
  w.shops.banh_mi.nextCustomerIn = 1e9;
  w.shops.banh_mi.stations.lo_banh_mi.running = false;
  joinPlayer(w, 'a', 'Bố');
  return w;
}

function endMonth(w: WorldState) {
  for (let d = 0; d < 7; d++) {
    w.secOfDay = 359.99;
    tick(w, 0.05);
  }
}

describe('bank', () => {
  it('values the starter cart at 4.000K and lends at least 2.000K', () => {
    const w = world();
    expect(assetValue(w)).toBe(4_000_000);
    expect(maxLoan(w)).toBe(2_000_000);
  });

  it('takes a loan with interest and equal monthly installments', () => {
    const w = world();
    const before = w.money;
    expect(takeLoan(w, 1_000_000, 2, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(before + 1_000_000);
    expect(w.loans[0]).toMatchObject({ principal: 1_000_000, totalDue: 1_090_000, installment: 545_000, monthsLeft: 2, paid: 0 });
    expect(maxLoan(w)).toBe(900_000);
    expect(w.log.at(-1)?.text).toBe('Bố vay 1.000K, kỳ 2 tháng (tổng trả 1.090K)');
  });

  it('rejects junk amounts and terms without changing anything (Review Focus 4)', () => {
    const w = world();
    const snap = JSON.stringify(w);
    for (const [amount, months] of [
      [NaN, 1], [-5, 1], ['1000000', 1], [250_000, 1], [150_000, 1], [3_000_000, 1], [1_000_000, 3], [1_000_000, '2'],
    ] as [unknown, unknown][]) {
      expect(takeLoan(w, amount, months, 'a')).toEqual({ ok: false, error: 'BAD_AMOUNT' });
    }
    expect(JSON.stringify(w)).toBe(snap);
  });

  it('collects one installment at each month end, then the loan is gone', () => {
    const w = world();
    takeLoan(w, 1_000_000, 2, 'a');
    endMonth(w);
    expect(w.loans[0]).toMatchObject({ paid: 545_000, monthsLeft: 1 });
    expect(w.months[0].loanDue).toBe(545_000);
    endMonth(w);
    expect(w.loans).toEqual([]);
  });

  it('repays early with no penalty', () => {
    const w = world();
    takeLoan(w, 1_000_000, 4, 'a');
    const id = w.loans[0].id;
    const before = w.money;
    expect(repayLoan(w, id, 'a')).toEqual({ ok: true });
    expect(w.money).toBe(before - 1_150_000);
    expect(w.loans).toEqual([]);
    expect(repayLoan(w, 'nope', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
