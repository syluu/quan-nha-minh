import { describe, expect, it } from 'vitest';
import { priceOf, spawnCustomer, tickCustomers } from '../src/sim/customers';
import { renamePlayer } from '../src/sim/players';
import { priceRange, setPrice } from '../src/sim/prices';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat, standAt } from './helpers';

function world() {
  const w = createWorld('X', 1);
  putPlayer(w, 'a', 0, 3).name = 'Bố';
  return w;
}

describe('priceRange', () => {
  it('allows 50%–200% of the market price in 500đ steps', () => {
    expect(priceRange('banh_mi')).toEqual({ min: 2500, max: 10000, step: 500, base: 5000 });
  });
});

describe('setPrice (Review Focus 4)', () => {
  it('sets a valid price and logs the change', () => {
    const w = world();
    expect(setPrice(w, 'banh_mi', 'banh_mi', 6000, 'a')).toEqual({ ok: true });
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(6000);
    expect(w.log.at(-1)?.text).toBe('Bố đổi giá Bánh mì: 5K → 6K');
  });

  it('clamps and rounds junk input', () => {
    const w = world();
    setPrice(w, 'banh_mi', 'banh_mi', NaN, 'a');
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(5000);
    setPrice(w, 'banh_mi', 'banh_mi', -5, 'a');
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(2500);
    setPrice(w, 'banh_mi', 'banh_mi', 1e10, 'a');
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(10000);
    setPrice(w, 'banh_mi', 'banh_mi', 4321, 'a');
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(4500);
    setPrice(w, 'banh_mi', 'banh_mi', '7000', 'a');
    expect(priceOf(w.shops.banh_mi, 'banh_mi')).toBe(4500);
  });

  it('does not log when the price does not change', () => {
    const w = world();
    setPrice(w, 'banh_mi', 'banh_mi', 5000, 'a');
    expect(w.log).toEqual([]);
  });

  it('refuses items that are not on sale yet', () => {
    const w = world();
    expect(setPrice(w, 'banh_mi', 'banh_mi_thit', 30000, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setPrice(w, 'banh_mi', 'trung_op', 3000, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(setPrice(w, 'banh_mi', 'khong_co' as never, 3000, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
  });
});

describe('sold counter', () => {
  it('counts every item a paying customer takes', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.ke_banh_mi.stock = 1;
    const c = standAt('thu_ngan');
    putPlayer(w, 'cashier', c.x, c.z);
    spawnCustomer(w, 'banh_mi');
    w.shops.banh_mi.nextCustomerIn = 1e9;
    repeat(20, (dt) => tickCustomers(w, 'banh_mi', dt));
    expect(w.dayStats.sold).toEqual({ banh_mi: 1 });
  });
});

describe('renamePlayer', () => {
  it('trims, caps at 16 characters and ignores blank names', () => {
    const w = world();
    renamePlayer(w, 'a', '  Ông Bố Siêu Đẹp Trai Nhất Nhà  ');
    expect(w.players.a.name).toBe('Ông Bố Siêu Đẹp');
    renamePlayer(w, 'a', '   ');
    expect(w.players.a.name).toBe('Ông Bố Siêu Đẹp');
  });
});
