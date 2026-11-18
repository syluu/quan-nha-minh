import { SHOPS, getStationDef } from '../content';
import type { ShopId } from '../content';

export interface Pt {
  x: number;
  z: number;
}

interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Khoảng cách tối thiểu (m) giữa đường đi và mép trạm / bàn. */
const CLEARANCE = 0.2;

const boxCache = new Map<ShopId, Box[]>();
function obstacles(shopId: ShopId): Box[] {
  let boxes = boxCache.get(shopId);
  if (!boxes) {
    boxes = SHOPS[shopId].stations.map((p) => {
      const fp = getStationDef(p.def).footprint;
      return {
        minX: p.x - fp.w / 2 - CLEARANCE,
        maxX: p.x + fp.w / 2 + CLEARANCE,
        minZ: p.z - fp.d / 2 - CLEARANCE,
        maxZ: p.z + fp.d / 2 + CLEARANCE,
      };
    });
    boxCache.set(shopId, boxes);
  }
  return boxes;
}

/** Đoạn a→b có chạm hộp không (Liang–Barsky). */
export function segmentHitsBox(a: Pt, b: Pt, box: Box): boolean {
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

/** Đoạn a→b không vướng bàn / trạm nào của quán. */
export function segmentClear(shopId: ShopId, a: Pt, b: Pt): boolean {
  return !obstacles(shopId).some((box) => segmentHitsBox(a, b, box));
}

/**
 * Đường đi từ `from` tới `to` trong quán: đi thẳng nếu không vướng gì; quán có bàn (có lưới lối đi)
 * thì đi theo lưới — các điểm giao của lối ngang và lối dọc — đường ngắn nhất (Dijkstra).
 * Trả về các điểm cần đi qua, điểm cuối luôn là `to`.
 */
export function routeAround(shopId: ShopId, from: Pt, to: Pt): Pt[] {
  const lanes = SHOPS[shopId].lanes;
  if (!lanes || segmentClear(shopId, from, to)) return [to];
  const grid: Pt[] = [];
  for (const z of lanes.z) for (const x of lanes.x) grid.push({ x, z });
  const nodes = [from, ...grid, to];
  const n = nodes.length;
  const goal = n - 1;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (let v = 1; v < n; v++) {
      if (done[v] || v === u) continue;
      const d = dist[u] + Math.hypot(nodes[v].x - nodes[u].x, nodes[v].z - nodes[u].z);
      if (d >= dist[v]) continue;
      if (!segmentClear(shopId, nodes[u], nodes[v])) continue;
      dist[v] = d;
      prev[v] = u;
    }
  }
  if (prev[goal] < 0) return [to]; // không tìm được lối: đi thẳng như cũ
  const path: Pt[] = [];
  for (let i = goal; i > 0; i = prev[i]) path.unshift(i === goal ? to : { ...nodes[i] });
  return path;
}
