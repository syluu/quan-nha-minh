// @vitest-environment jsdom
import { V3 } from './fixtures';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '@qnm/shared';
import { pricesTab } from '../src/ui/menu/pricesTab';

function snap(price?: number): Snapshot {
  const st = (instanceId: string, unlocked: boolean) => ({ instanceId, unlocked, outputCount: 0, stock: 0, inputs: {}, enabled: true, seats: [], blocked: null, level: 0 });
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, day: 1, secOfDay: 0, money: 0, stars: 3, tiles: [], customers: [], log: [], players: [], staff: [],
    stations: [st('ke_banh_mi', true)], prices: price ? { banh_mi: price } : {},
    ...V3,
  };
}

describe('prices tab', () => {
  it('two quick + clicks before the next snapshot raise the price by two steps', () => {
    const sent: number[] = [];
    const conn = { setPrice: (_item: string, p: number) => sent.push(p) } as never;
    let latest = snap();
    document.body.innerHTML = '<div id="b"></div>';
    const body = document.getElementById('b')!;
    const stop = pricesTab(conn, () => latest).mount(body) as () => void;
    const plus = () => body.querySelector<HTMLButtonElement>('[data-step="500"]')!;
    plus().click();
    plus().click();
    expect(sent).toEqual([5500, 6000]);
    latest = snap(6000); // máy chủ xác nhận
    plus().click();
    expect(sent.at(-1)).toBe(6500);
    stop();
  });
});
