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
