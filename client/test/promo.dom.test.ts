// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Snapshot } from '@qnm/shared';
import { KOL_VISIT, visitPhase } from '../src/game/promoSchedule';
import { promoAlertsView } from '../src/ui/promoAlert';
import { V3 } from './fixtures';

beforeAll(() => {
  // jsdom không có canvas 2D: bản giả đủ cho chữ trên biển/nhãn.
  const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 40 }) : () => {}), set: () => true });
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
});

function snap(campaigns: Snapshot['campaigns'], secOfDay: number): Snapshot {
  return {
    shopId: 'banh_mi', shops: [], canRent: false, warehouse: {}, farm: { owned: false, level: 0, plots: [] }, day: 1, secOfDay, money: 0, stars: 3,
    tiles: [], customers: [], log: [], prices: {}, players: [], stations: [], staff: [],
    ...V3, campaigns, ads: [],
  } as Snapshot;
}

describe('KOL visit schedule', () => {
  it('walks in, films, then walks out within the day', () => {
    expect(visitPhase(KOL_VISIT, 5)).toBeNull();
    expect(visitPhase(KOL_VISIT, 25)).toMatchObject({ state: 'enter', k: 0.5 });
    expect(visitPhase(KOL_VISIT, 100)?.state).toBe('work');
    expect(visitPhase(KOL_VISIT, 210)?.state).toBe('leave');
    expect(visitPhase(KOL_VISIT, 300)).toBeNull();
  });
});

describe('promo alerts on the left', () => {
  it('announces the KOL and the reviewer while they are in the shop', () => {
    expect(promoAlertsView(snap([{ id: 'kol', daysLeft: 2 }], 100))[0].text).toContain('KOL đang quay video');
    expect(promoAlertsView(snap([{ id: 'kol', daysLeft: 2 }], 300))).toEqual([]);
    expect(promoAlertsView(snap([{ id: 'review', daysLeft: 1 }], 120))[0].text).toContain('Người review');
    expect(promoAlertsView(snap([{ id: 'to_roi', daysLeft: 1 }], 120))).toEqual([]);
  });
});

describe('promo decor in the 3D scene', () => {
  it('shows a figure for each running campaign and removes everything when they end', async () => {
    const { createPromoDecor } = await import('../src/render/promoDecor');
    const scene = new THREE.Scene();
    const decor = createPromoDecor(scene);
    const base = scene.children.length;
    const all = ['kol', 'review', 'bao_chi', 'livestream', 'xe_loa', 'bang_ron', 'an_thu', 'to_roi', 'mxh', 'app_top'] as const;
    decor.update(snap(all.map((id) => ({ id, daysLeft: 1 })), 100), 0.05, 1);
    expect(scene.children.length).toBeGreaterThan(base + 8);
    const names: string[] = [];
    scene.traverse((o) => o.userData.text && names.push(o.userData.text));
    expect(names.some((n) => n.includes('KOL'))).toBe(true);
    expect(names.some((n) => n.includes('LIVE'))).toBe(true);
    decor.update(snap([], 100), 0.05, 1);
    let left = 0;
    scene.traverse((o) => ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite ? left++ : 0));
    expect(left).toBe(0);
  });
});
