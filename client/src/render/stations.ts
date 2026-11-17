import * as THREE from 'three';
import { getStationDef } from '@qnm/shared';
import type { ItemId, PlacedStation, Snapshot } from '@qnm/shared';
import { ITEM_STACK_H, createItemMesh } from './items';
import { box, makeLabel, markSharedGeometry, mat } from './materials';

type StationSnap = Snapshot['stations'][number];

const LOOK: Record<string, { color: number; h: number }> = {
  lo_banh_mi: { color: 0x9aa3ad, h: 1.0 },
  chao_op_la: { color: 0x5a5a5a, h: 0.85 },
  lo_than: { color: 0x3b3b3b, h: 0.7 },
  binh_tra: { color: 0x6aa0c8, h: 0.8 },
  noi_com: { color: 0xc9ccd0, h: 0.9 },
  lo_suon: { color: 0x3b3b3b, h: 0.7 },
  chao_cha: { color: 0x5a5a5a, h: 0.85 },
  noi_nuoc_dung: { color: 0xa9b0b8, h: 1.05 },
  may_banh_pho: { color: 0xe6e0d0, h: 0.95 },
  thot_bo: { color: 0x9a6a3a, h: 0.8 },
  may_pha_phin: { color: 0x6b4a32, h: 0.95 },
};
const HOT_TOP = new Set(['lo_than', 'lo_suon']);

const plateGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.03, 10);
const stoolGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.45, 8);
const sproutGeo = new THREE.ConeGeometry(0.16, 0.3, 6);
const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10);
markSharedGeometry(plateGeo, stoolGeo, sproutGeo, wheelGeo);

function itemGrid(items: ItemId[], w: number, d: number, y: number): THREE.Group {
  const g = new THREE.Group();
  const cols = Math.max(1, Math.floor(w / 0.32));
  const rows = Math.max(1, Math.floor(d / 0.26));
  const perLayer = cols * rows;
  items.forEach((it, i) => {
    const layer = Math.floor(i / perLayer);
    const k = i % perLayer;
    const m = createItemMesh(it);
    m.position.set((k % cols - (cols - 1) / 2) * 0.32, y + 0.06 + layer * ITEM_STACK_H, (Math.floor(k / cols) - (rows - 1) / 2) * 0.26);
    g.add(m);
  });
  return g;
}

export interface StationView {
  group: THREE.Group;
  update(s: StationSnap): void;
}

/** Mô hình trạm (máy/bàn/kệ/thu ngân) + các món đang nằm trên đó. Ẩn khi chưa mở (ô trả tiền hiện thay). */
export function createStationView(placed: PlacedStation): StationView {
  const def = getStationDef(placed.def);
  const group = new THREE.Group();
  group.position.set(placed.x, 0, placed.z);
  const { w, d } = def.footprint;
  let topY = 0.9;

  if (def.kind === 'producer') {
    const look = LOOK[def.id] ?? { color: 0x888888, h: 0.9 };
    topY = look.h;
    const body = box(w, look.h, d, look.color);
    body.position.y = look.h / 2;
    group.add(body);
    const top = box(w * 0.95, 0.05, d * 0.95, HOT_TOP.has(def.id) ? 0xc0392b : 0x5b4636, HOT_TOP.has(def.id) ? 0xff3010 : 0);
    top.position.y = look.h + 0.02;
    group.add(top);
    if (def.id === 'lo_banh_mi') {
      const glow = box(0.7, 0.35, 0.03, 0xffa040, 0xff7a00);
      glow.position.set(0, 0.55, d / 2 + 0.01);
      group.add(glow);
    }
  } else if (def.kind === 'assembler') {
    const legs = box(w * 0.9, 0.85, d * 0.9, 0xb5793f);
    legs.position.y = 0.42;
    const board = box(w, 0.07, d, 0x8a5426);
    board.position.y = 0.88;
    group.add(legs, board);
  } else if (def.kind === 'display') {
    const body = box(w, 0.85, d, 0xd29a5c);
    body.position.y = 0.42;
    const glass = box(w * 0.96, 0.05, d * 0.96, 0x8a5426);
    glass.position.y = 0.87;
    group.add(body, glass);
  } else if (def.kind === 'pickup') {
    topY = 0.8;
    const desk = box(w, 0.8, d, 0x1fa34a);
    desk.position.y = 0.4;
    const top = box(w * 1.05, 0.06, d * 1.05, 0xf2f2f2);
    top.position.y = 0.82;
    group.add(desk, top);
    const sign = makeLabel('🛵 Giao hàng', { bg: '#1f8a3a', size: 30, scale: 0.006 });
    sign.position.set(0, 1.5, 0);
    group.add(sign);
  } else if (def.kind === 'plot') {
    topY = 0.3;
    if (!def.animal) {
      // Ruộng: luống đất + cây xanh (lúa mì vàng, lúa xanh nhạt, rau xanh đậm).
      const soil = box(w, 0.18, d, 0x6b4a2b);
      soil.position.y = 0.09;
      group.add(soil);
      const leaf = def.id === 'ruong_lua_mi' ? 0xd9b44a : def.id === 'ruong_lua' ? 0x9cc65a : 0x3f8f3a;
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++) {
          const plant = new THREE.Mesh(sproutGeo, mat(leaf));
          plant.position.set((i - 1.5) * (w / 4.4), 0.32, (j - 1) * (d / 3.4));
          group.add(plant);
        }
    } else {
      // Chuồng: nền rơm + rào gỗ + con vật khối.
      const floor = box(w, 0.06, d, 0xd8c27a);
      floor.position.y = 0.03;
      group.add(floor);
      for (const [fx, fz, fw, fd] of [[0, -d / 2, w, 0.08], [0, d / 2, w, 0.08], [-w / 2, 0, 0.08, d], [w / 2, 0, 0.08, d]]) {
        const rail = box(fw, 0.5, fd, 0x8a5a2b);
        rail.position.set(fx, 0.25, fz);
        group.add(rail);
      }
      const look = def.id === 'chuong_ga' ? { c: 0xf4f1ea, s: 0.25, n: 4 } : def.id === 'chuong_lon' ? { c: 0xe8a0a0, s: 0.45, n: 2 } : { c: 0x6b4a32, s: 0.6, n: 2 };
      for (let i = 0; i < look.n; i++) {
        const a = box(look.s * 1.4, look.s, look.s, look.c);
        a.position.set((i - (look.n - 1) / 2) * (w / (look.n + 0.5)), look.s / 2 + 0.06, (i % 2 ? 0.2 : -0.2));
        group.add(a);
      }
    }
  } else if (def.kind === 'truck') {
    topY = 0.9;
    const bed = box(w, 0.5, d * 0.65, 0x3d7dd8);
    bed.position.set(0, 0.55, -d * 0.17);
    const cab = box(w, 0.9, d * 0.32, 0x2f5fa8);
    cab.position.set(0, 0.75, d * 0.33);
    const glass = box(w * 0.9, 0.3, 0.03, 0xbfe3ff);
    glass.position.set(0, 0.95, d * 0.49 + 0.01);
    group.add(bed, cab, glass);
    for (const [wx, wz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const wheel = new THREE.Mesh(wheelGeo, mat(0x222222));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set((wx * w) / 2, 0.2, wz * d * 0.32);
      group.add(wheel);
    }
    const sign = makeLabel('🚚 Bốc hàng vào kho', { bg: '#2f5fa8', size: 28, scale: 0.006 });
    sign.position.set(0, 1.7, 0);
    group.add(sign);
  } else if (def.kind === 'table') {
    topY = 0.75;
    const top = box(w, 0.06, d, 0xc98a4b);
    top.position.y = 0.75;
    group.add(top);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(0.06, 0.72, 0.06, 0x7a4e2a);
      leg.position.set((lx * (w - 0.12)) / 2, 0.36, (lz * (d - 0.12)) / 2);
      group.add(leg);
    }
    for (const seat of placed.seatPoints ?? []) {
      const stool = new THREE.Mesh(stoolGeo, mat(0x2f6db5));
      stool.position.set(seat.x - placed.x, 0.22, seat.z - placed.z);
      group.add(stool);
    }
  } else if (def.kind === 'trash') {
    topY = 0.7;
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.23, 0.62, 12), mat(0x6b7a6e));
    bin.position.y = 0.31;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 12), mat(0x4a564c));
    lid.position.y = 0.65;
    group.add(bin, lid);
  } else {
    const body = box(w, 0.9, d, 0x8a5426);
    body.position.y = 0.45;
    const reg = box(0.36, 0.26, 0.3, 0x2f2f2f);
    reg.position.set(0.2, 1.03, -0.1);
    group.add(body, reg);
    const sign = makeLabel('Thu ngân', { bg: '#2b2118', size: 30, scale: 0.006 });
    sign.position.set(0, 1.55, 0);
    group.add(sign);
  }

  const name = makeLabel(def.name, { color: '#2b2118', bg: 'rgba(255,250,240,.85)', size: 26, scale: 0.006 });
  name.position.set(0, topY + 0.9, 0);
  name.visible = def.kind !== 'cashier' && def.kind !== 'pickup' && def.kind !== 'truck';
  group.add(name);

  if (def.kind === 'cashier') {
    // Ô vàng sau quầy: đứng ở đây là có người thu ngân.
    const spot = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(0, 0.015, -d / 2 - 0.5);
    group.add(spot);
  }

  const warn = makeLabel('💸 Hết tiền', { bg: '#c8452c', size: 30, scale: 0.007 });
  warn.position.set(0, topY + 1.3, 0);
  warn.visible = false;
  group.add(warn);
  const off = makeLabel('⏻ TẮT', { bg: '#555', size: 30, scale: 0.007 });
  off.position.set(0, topY + 1.3, 0);
  off.visible = false;
  group.add(off);
  const dirtyTag = makeLabel('🧽 Cần dọn', { bg: '#8a6d3b', size: 28, scale: 0.006 });
  dirtyTag.position.set(0, 1.6, 0);
  dirtyTag.visible = false;
  group.add(dirtyTag);

  const contents = new THREE.Group();
  group.add(contents);
  let key = '';

  return {
    group,
    update(s) {
      group.visible = s.unlocked;
      if (!s.unlocked) return;
      warn.visible = s.blocked === 'no_money';
      off.visible = !s.enabled;
      if (def.kind === 'table') {
        // Đĩa bẩn ở chỗ đã ăn xong; khách đang ngồi thì chưa có đĩa bẩn.
        const k = s.seats.join(',');
        dirtyTag.visible = s.seats.includes('dirty');
        if (k === key) return;
        key = k;
        contents.clear();
        (placed.seatPoints ?? []).forEach((seat, i) => {
          if (s.seats[i] !== 'dirty') return;
          const plate = new THREE.Mesh(plateGeo, mat(0xd8d2c4));
          plate.position.set(seat.x - placed.x, topY + 0.05, (seat.z - placed.z) * 0.35);
          const crumbs = new THREE.Mesh(plateGeo, mat(0x8a6d3b));
          crumbs.scale.set(0.5, 0.6, 0.4);
          crumbs.position.set(seat.x - placed.x + 0.03, topY + 0.07, (seat.z - placed.z) * 0.35);
          contents.add(plate, crumbs);
        });
        return;
      }
      let items: ItemId[] = [];
      if (def.kind === 'producer' || def.kind === 'plot') items = Array(s.outputCount).fill(def.output);
      else if (def.kind === 'display') items = Array(s.stock).fill(def.item);
      else if (def.kind === 'assembler') {
        for (const inp of def.inputs) items.push(...Array<ItemId>(s.inputs[inp.item] ?? 0).fill(inp.item));
        items.push(...Array<ItemId>(s.outputCount).fill(def.output));
      }
      const k = items.join(',');
      if (k === key) return;
      key = k;
      contents.clear();
      contents.add(itemGrid(items, w, d, topY));
    },
  };
}

