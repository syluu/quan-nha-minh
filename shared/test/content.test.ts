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

  it('no pay tile circle touches the pick-up zone of another station', () => {
    for (const tile of shop.stations.filter((s) => s.unlockCost > 0))
      for (const other of shop.stations) {
        if (other === tile) continue;
        const b = footprintOf(other);
        const dx = Math.max(b.minX - tile.x, 0, tile.x - b.maxX);
        const dz = Math.max(b.minZ - tile.z, 0, tile.z - b.maxZ);
        expect(Math.hypot(dx, dz), `${tile.instanceId} vs ${other.instanceId}`).toBeGreaterThan(BALANCE.INTERACT_DIST + BALANCE.PAY_TILE_RADIUS);
      }
  });

  it('pick-up zones of any two stations do not overlap', () => {
    const boxes = shop.stations.map((s) => [s.instanceId, footprintOf(s)] as const);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i][1];
        const b = boxes[j][1];
        const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
        const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
        expect(Math.hypot(dx, dz), `${boxes[i][0]} vs ${boxes[j][0]}`).toBeGreaterThan(2 * BALANCE.INTERACT_DIST);
      }
  });

  it("every workPoint is within INTERACT_DIST of its own station and outside every other station's zone", () => {
    for (const s of shop.stations) {
      expect(s.workPoint, s.instanceId).toBeDefined();
      for (const other of shop.stations) {
        const b = footprintOf(other);
        const dx = Math.max(b.minX - s.workPoint.x, 0, s.workPoint.x - b.maxX);
        const dz = Math.max(b.minZ - s.workPoint.z, 0, s.workPoint.z - b.maxZ);
        const d = Math.hypot(dx, dz);
        if (other === s) expect(d, s.instanceId).toBeLessThanOrEqual(BALANCE.INTERACT_DIST);
        else expect(d, `${s.instanceId} workPoint vs ${other.instanceId}`).toBeGreaterThan(BALANCE.INTERACT_DIST);
      }
    }
  });

  it("the trash bin exists, costs nothing and is not reachable from any other station's zone", () => {
    const trash = shop.stations.find((s) => getStationDef(s.def).kind === 'trash');
    expect(trash).toBeDefined();
    expect(trash!.unlockCost).toBe(0);
  });

  it('staff route between any two kitchen/shelf workPoints does not cross a footprint', () => {
    const pts = shop.stations.filter((s) => !['trash', 'table'].includes(getStationDef(s.def).kind)).map((s) => s.workPoint);
    const boxes = shop.stations.map((s) => footprintOf(s, BALANCE.PLAYER_RADIUS));
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        for (const box of boxes) expect(segmentHitsBox(pts[i], pts[j], box), JSON.stringify([pts[i], pts[j]])).toBe(false);
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

describe('balance plan 3', () => {
  it('staff levels match the approved table', () => {
    expect(BALANCE.STAFF_LEVELS.map((l) => [l.speed, l.carry, l.wage, l.train])).toEqual([
      [2.24, 3, 120_000, 0],
      [2.56, 4, 150_000, 500_000],
      [2.88, 5, 180_000, 800_000],
      [3.2, 6, 210_000, 1_300_000],
    ]);
  });
  it('every starter station has a value', () => {
    for (const s of Object.values(SHOPS).flatMap((sh) => sh.stations).filter((x) => x.unlockCost === 0))
      expect(BALANCE.STARTER_VALUES[s.instanceId], s.instanceId).toBeTypeOf('number');
  });
});

describe('pickup point (plan 4)', () => {
  it('exists, costs 2.000K, and the shipper route from the street is clear', () => {
    const shop = SHOPS.banh_mi;
    const p = shop.stations.find((s) => getStationDef(s.def).kind === 'pickup')!;
    expect(p).toBeDefined();
    expect(p.unlockCost).toBe(2_000_000);
    expect(p.shipperPoint).toBeDefined();
    for (const s of shop.stations) {
      const def = getStationDef(s.def);
      const b = { minX: s.x - def.footprint.w / 2 - 0.2, maxX: s.x + def.footprint.w / 2 + 0.2, minZ: s.z - def.footprint.d / 2 - 0.2, maxZ: s.z + def.footprint.d / 2 + 0.2 };
      expect(segmentHitsBox(shop.shipperSpawn, p.shipperPoint!, b), s.instanceId).toBe(false);
    }
  });
  it('online balance numbers', () => {
    expect(BALANCE.ONLINE).toMatchObject({ commission: 0.2, baseIntervalSec: 20, maxPending: 6, carUpgradeCost: 5_000_000 });
    expect(BALANCE.ONLINE.bike).toMatchObject({ patience: 60, batch: 1 });
    expect(BALANCE.ONLINE.car).toMatchObject({ patience: 90, batchMin: 2, batchMax: 5, waitOldest: 30 });
  });
});


describe('plan 5 content', () => {
  it('has the three shop types with meta (deposit, rent, tables)', async () => {
    const { SHOP_META } = await import('../src/content');
    expect(Object.keys(SHOPS).sort()).toEqual(['banh_mi', 'com_tam', 'pho_cafe']);
    expect(SHOP_META.banh_mi).toMatchObject({ deposit: 0, rentPerMonth: 0, hasTables: false });
    expect(SHOP_META.com_tam).toMatchObject({ deposit: 8_000_000, rentPerMonth: 4_000_000, hasTables: true });
    expect(SHOP_META.pho_cafe).toMatchObject({ deposit: 12_000_000, rentPerMonth: 6_000_000, hasTables: true });
  });

  it('costs of the new dishes follow the recipes', async () => {
    const { itemCost } = await import('../src/content');
    expect(itemCost('com_tam_suon')).toBe(10_000);
    expect(itemCost('com_tam_suon_cha')).toBe(19_000);
    expect(itemCost('pho_bo')).toBe(27_000);
    expect(itemCost('ca_phe_sua_da')).toBe(6_000);
  });

  it.each(['com_tam', 'pho_cafe'] as const)('%s has 4 tables whose seats are reachable from the cashier and the exit', (id) => {
    const shop = SHOPS[id];
    const tables = shop.stations.filter((s) => getStationDef(s.def).kind === 'table');
    expect(tables).toHaveLength(4);
    const cashier = shop.stations.find((s) => getStationDef(s.def).kind === 'cashier')!;
    const boxes = shop.stations.map((s) => footprintOf(s, 0.05));
    for (const t of tables) {
      expect(t.seatPoints).toHaveLength(2);
      for (const seat of t.seatPoints!)
        for (const box of boxes) {
          expect(segmentHitsBox(cashier.customerPoint!, seat, box), `${t.instanceId} from cashier`).toBe(false);
          expect(segmentHitsBox(seat, shop.exit, box), `${t.instanceId} to exit`).toBe(false);
        }
    }
  });
});
