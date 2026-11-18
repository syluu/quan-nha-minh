import { describe, expect, it } from 'vitest';
import { tickCustomers } from '../src/sim/customers';
import { effectiveStars, marketingMultiplier, runCampaign } from '../src/sim/marketing';
import { joinPlayer } from '../src/sim/players';
import { advanceTime } from '../src/sim/time';
import { createWorld } from '../src/sim/world';
import type { WorldState } from '../src/sim/world';
import { repeat } from './helpers';

function world(seed = 1): WorldState {
  const w = createWorld('X', seed);
  w.money = 10_000_000;
  joinPlayer(w, 'a', 'Bố');
  return w;
}

describe('campaigns', () => {
  it('charges the cost and stacks with diminishing effect', () => {
    const w = world();
    const shop = w.shops.banh_mi;
    expect(runCampaign(w, 'banh_mi', 'mxh', 'a')).toEqual({ ok: true });
    expect(w.money).toBe(9_000_000);
    expect(w.dayStats.marketing).toBe(1_000_000);
    expect(marketingMultiplier(shop)).toBeCloseTo(1.5);
    runCampaign(w, 'banh_mi', 'to_roi', 'a');
    expect(marketingMultiplier(shop)).toBeCloseTo(1.6);
    runCampaign(w, 'banh_mi', 'review', 'a');
    expect(marketingMultiplier(shop)).toBeCloseTo(1 + 1 + 0.25 + 0.05);
    expect(effectiveStars(shop)).toBeCloseTo(3.3);
    expect(w.log.at(-1)?.text).toBe('Bố chạy quảng cáo: Mời người review đồ ăn (5.000K)');
  });

  it('expires after its number of days', () => {
    const w = world();
    runCampaign(w, 'banh_mi', 'mxh', 'a');
    for (let d = 0; d < 3; d++) {
      expect(w.shops.banh_mi.campaigns).toHaveLength(1);
      w.secOfDay = 359.99;
      advanceTime(w, 0.05);
    }
    expect(w.shops.banh_mi.campaigns).toEqual([]);
    expect(marketingMultiplier(w.shops.banh_mi)).toBe(1);
  });

  it('rejects unknown campaigns and short money (Review Focus 4)', () => {
    const w = world();
    expect(runCampaign(w, 'banh_mi', 'tiktok', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    w.money = 100_000;
    expect(runCampaign(w, 'banh_mi', 'mxh', 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
    expect(w.shops.banh_mi.campaigns).toEqual([]);
  });

  it('brings more customers on the same seed', () => {
    const count = (withAd: boolean) => {
      const w = world(42);
      if (withAd) runCampaign(w, 'banh_mi', 'mxh', 'a');
      repeat(180, (dt) => {
        w.shops.banh_mi.stations.ke_banh_mi.stock = 10;
        tickCustomers(w, 'banh_mi', dt);
        w.secOfDay += dt;
      });
      return w.shops.banh_mi.nextCustomerId;
    };
    expect(count(true)).toBeGreaterThan(count(false));
  });
});

describe('richer marketing (owner request)', () => {
  it('has realistic options incl. KOL review and a LED billboard; numbers make sense', async () => {
    const { BALANCE } = await import('../src/content');
    expect(Object.keys(BALANCE.CAMPAIGNS).length).toBeGreaterThanOrEqual(8);
    expect(BALANCE.CAMPAIGNS.kol.name).toContain('KOL');
    expect(BALANCE.ADS.bien_led.name).toContain('LED');
    for (const c of Object.values(BALANCE.CAMPAIGNS)) expect(c.boost + c.onlineBoost + c.starBonus, c.name).toBeGreaterThan(0);
  });

  it('running the same campaign again extends it instead of stacking', () => {
    const w = world();
    runCampaign(w, 'banh_mi', 'xe_loa', 'a');
    runCampaign(w, 'banh_mi', 'xe_loa', 'a');
    expect(w.shops.banh_mi.campaigns).toEqual([{ id: 'xe_loa', daysLeft: 2 }]);
    expect(marketingMultiplier(w.shops.banh_mi)).toBeCloseTo(1.45);
    expect(w.log.at(-1)?.text).toContain('gia hạn');
  });

  it('a KOL boosts walk-ins, online orders and stars; app-top only boosts online orders', async () => {
    const { onlineMarketingMultiplier } = await import('../src/sim/marketing');
    const w = world();
    w.money = 50_000_000;
    runCampaign(w, 'banh_mi', 'app_top', 'a');
    expect(marketingMultiplier(w.shops.banh_mi)).toBe(1);
    expect(onlineMarketingMultiplier(w.shops.banh_mi)).toBeCloseTo(2);
    runCampaign(w, 'banh_mi', 'kol', 'a');
    expect(marketingMultiplier(w.shops.banh_mi)).toBeCloseTo(3);
    expect(effectiveStars(w.shops.banh_mi)).toBeCloseTo(3.5);
  });

  it('long-term ads: bought once per shop, always on, gone when the place is returned', async () => {
    const { buyAd } = await import('../src/sim/marketing');
    const w = world();
    expect(buyAd(w, 'banh_mi', 'bien_led', 'a')).toEqual({ ok: true });
    expect(w.money).toBe(7_000_000);
    expect(w.dayStats.marketing).toBe(3_000_000);
    expect(buyAd(w, 'banh_mi', 'bien_led', 'a')).toEqual({ ok: false, error: 'NO_SLOT' });
    expect(buyAd(w, 'farm', 'bien_led', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(buyAd(w, 'banh_mi', 'toString', 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(marketingMultiplier(w.shops.banh_mi)).toBeCloseTo(1.15);
    runCampaign(w, 'banh_mi', 'mxh', 'a');
    expect(marketingMultiplier(w.shops.banh_mi)).toBeCloseTo(1.15 * 1.5);
    // Không bị hết hạn qua ngày.
    for (let d = 0; d < 5; d++) {
      w.secOfDay = 359.99;
      advanceTime(w, 0.05);
    }
    expect(w.shops.banh_mi.ads).toEqual(['bien_led']);
    w.money = 100_000;
    expect(buyAd(w, 'banh_mi', 'den_long', 'a')).toEqual({ ok: false, error: 'NO_MONEY' });
  });
});

describe('selling warehouse stock at the market (owner request)', () => {
  it('sells at 60% of the market price, counts as revenue, never below zero', async () => {
    const { sellWarehouse } = await import('../src/sim/marketing');
    const w = world();
    w.warehouse = { xuong_bo: 25, rau: 3 };
    expect(sellWarehouse(w, 'xuong_bo', 10, 'a')).toEqual({ ok: true });
    expect(w.warehouse.xuong_bo).toBe(15);
    expect(w.money).toBe(10_000_000 + 10 * 4_800);
    expect(w.dayStats.revenue).toBe(48_000);
    expect(sellWarehouse(w, 'rau', 10, 'a')).toEqual({ ok: true }); // chỉ còn 3 → bán 3
    expect(w.warehouse.rau).toBe(0);
    expect(sellWarehouse(w, 'xuong_bo', 'all', 'a')).toEqual({ ok: true });
    expect(w.warehouse.xuong_bo).toBe(0);
    expect(sellWarehouse(w, 'xuong_bo', 'all', 'a')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(sellWarehouse(w, 'rau', -5, 'a')).toEqual({ ok: false, error: 'BAD_AMOUNT' });
    expect(sellWarehouse(w, 'vang', 1, 'a')).toEqual({ ok: false, error: 'BAD_ITEM' });
  });

  it('works during the month-end settlement and can close it', async () => {
    const { sellWarehouse } = await import('../src/sim/marketing');
    const w = world();
    w.money = 0;
    w.warehouse = { thit_bo: 100 };
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 500_000, loanDue: 0, totalDue: 500_000 };
    expect(sellWarehouse(w, 'thit_bo', 'all', 'a')).toEqual({ ok: true });
    expect(w.settlement).toBeNull();
    expect(w.money).toBe(900_000 - 500_000);
  });
});
