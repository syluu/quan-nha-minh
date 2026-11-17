import { describe, expect, it } from 'vitest';
import { BALANCE, INGREDIENTS, ITEMS, SHOPS, STATIONS, getStationDef } from '../src/content';
import type { PlacedStation, ShopLayout } from '../src/content';

const shops = Object.values(SHOPS);

function footprintOf(p: PlacedStation, grow = 0) {
  const def = getStationDef(p.def);
  const w = def.footprint.w / 2 + grow;
  const d = def.footprint.d / 2 + grow;
  return { minX: p.x - w, maxX: p.x + w, minZ: p.z - d, maxZ: p.z + d };
}

type Box = ReturnType<typeof footprintOf>;
type Pt = { x: number; z: number };

// Liang–Barsky: does segment a→b touch the box?
function segmentHitsBox(a: Pt, b: Pt, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const checks: [number, number][] = [
    [-dx, a.x - box.minX],
    [dx, box.maxX - a.x],
    [-dz, a.z - box.minZ],
    [dz, box.maxZ - a.z],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}

function customerPoints(shop: ShopLayout): Pt[] {
  return shop.stations.filter((s) => s.customerPoint).map((s) => s.customerPoint!);
}

describe.each(shops.map((s) => [s.id, s] as const))('shop %s', (_id, shop) => {
  it('every station def / ingredient / item referenced exists', () => {
    for (const p of shop.stations) {
      const def = STATIONS[p.def];
      expect(def, p.def).toBeDefined();
      if (def.kind === 'producer' || def.kind === 'assembler') {
        expect(ITEMS[def.output]).toBeDefined();
        for (const ing of def.ingredients) expect(INGREDIENTS[ing.id], ing.id).toBeDefined();
      }
      if (def.kind === 'assembler') for (const i of def.inputs) expect(ITEMS[i.item]).toBeDefined();
      if (def.kind === 'display') expect(ITEMS[def.item]).toBeDefined();
    }
  });

  it('every display item is sellable and some station in the shop outputs it', () => {
    const outputs = new Set(
      shop.stations
        .map((p) => getStationDef(p.def))
        .flatMap((d) => (d.kind === 'producer' || d.kind === 'assembler' ? [d.output] : [])),
    );
    for (const p of shop.stations) {
      const def = getStationDef(p.def);
      if (def.kind !== 'display') continue;
      expect(ITEMS[def.item].sellable, def.item).toBe(true);
      expect(outputs.has(def.item), def.item).toBe(true);
      expect(p.customerPoint, p.instanceId).toBeDefined();
    }
  });

  it('requires references existing instanceIds and the graph is acyclic', () => {
    const ids = new Set(shop.stations.map((s) => s.instanceId));
    expect(ids.size).toBe(shop.stations.length);
    for (const s of shop.stations) for (const r of s.requires) expect(ids.has(r), r).toBe(true);
    const byId = new Map(shop.stations.map((s) => [s.instanceId, s]));
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string) => {
      if (done.has(id)) return;
      expect(visiting.has(id), `cycle at ${id}`).toBe(false);
      visiting.add(id);
      for (const r of byId.get(id)!.requires) visit(r);
      visiting.delete(id);
      done.add(id);
    };
    for (const id of ids) visit(id);
  });

  it('starter set (unlockCost 0) has ≥1 producer, ≥1 display, exactly 1 cashier', () => {
    const starter = shop.stations.filter((s) => s.unlockCost === 0).map((s) => getStationDef(s.def).kind);
    expect(starter.filter((k) => k === 'producer').length).toBeGreaterThanOrEqual(1);
    expect(starter.filter((k) => k === 'display').length).toBeGreaterThanOrEqual(1);
    expect(starter.filter((k) => k === 'cashier').length).toBe(1);
    for (const s of shop.stations) if (s.unlockCost === 0) expect(s.requires).toEqual([]);
  });

  it('footprints are inside bounds and do not overlap', () => {
    const boxes = shop.stations.map((s) => [s.instanceId, footprintOf(s)] as const);
    for (const [id, b] of boxes) {
      expect(b.minX >= shop.bounds.minX && b.maxX <= shop.bounds.maxX, id).toBe(true);
      expect(b.minZ >= shop.bounds.minZ && b.maxZ <= shop.bounds.maxZ, id).toBe(true);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i][1];
        const b = boxes[j][1];
        const overlap = a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;
        expect(overlap, `${boxes[i][0]} vs ${boxes[j][0]}`).toBe(false);
      }
  });

  it('every pay tile centre is outside the pick-up zone of every other station', () => {
    for (const tile of shop.stations.filter((s) => s.unlockCost > 0))
      for (const other of shop.stations) {
        if (other === tile) continue;
        const b = footprintOf(other);
        const dx = Math.max(b.minX - tile.x, 0, tile.x - b.maxX);
        const dz = Math.max(b.minZ - tile.z, 0, tile.z - b.maxZ);
        expect(Math.hypot(dx, dz), `${tile.instanceId} vs ${other.instanceId}`).toBeGreaterThan(BALANCE.INTERACT_DIST);
      }
  });

  it('customer paths are clear', () => {
    const boxes = shop.stations.map((s) => footprintOf(s, 0.2));
    const cashier = shop.stations.find((s) => getStationDef(s.def).kind === 'cashier')!;
    const pts = customerPoints(shop);
    const segments: [Pt, Pt][] = [];
    for (const p of pts) segments.push([shop.entrance, p]);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) segments.push([pts[i], pts[j]]);
    segments.push([cashier.customerPoint!, shop.exit]);
    const queue: Pt[] = [];
    for (let i = 0; i < BALANCE.MAX_CUSTOMERS / 2; i++)
      queue.push({
        x: cashier.customerPoint!.x + shop.queueDir.x * BALANCE.QUEUE_SPACING * i,
        z: cashier.customerPoint!.z + shop.queueDir.z * BALANCE.QUEUE_SPACING * i,
      });
    for (const q of queue) {
      segments.push([q, shop.exit]);
      for (const p of pts) segments.push([p, q]);
    }
    for (const [a, b] of segments)
      for (const box of boxes) expect(segmentHitsBox(a, b, box), JSON.stringify([a, b])).toBe(false);
  });
});

describe('balance', () => {
  it('starts with 5.000K', () => {
    expect(BALANCE.START_MONEY).toBe(5_000_000);
  });
});
