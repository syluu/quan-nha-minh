import * as THREE from 'three';
import { STATIONS, getStationDef } from '@qnm/shared';
import type { ItemId, PlacedStation, Snapshot, StationDef } from '@qnm/shared';
import { ITEM_STACK_H } from './items';
import { buildAssembler, buildDisplay, buildProducer, itemsOnTray } from './machineModels';
import type { Tray } from './machineModels';
import { box, disposeLabel, disposeTree, makeLabel, markSharedGeometry, mat } from './materials';

type StationSnap = Snapshot['stations'][number];

const plateGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.03, 10);
const stoolGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.45, 8);
const sproutGeo = new THREE.ConeGeometry(0.16, 0.3, 6);
const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10);
markSharedGeometry(plateGeo, stoolGeo, sproutGeo, wheelGeo);

function itemGrid(items: ItemId[], w: number, d: number, y: number): THREE.Group {
  return itemsOnTray(items, { w, d, z: 0, y }, ITEM_STACK_H);
}


/** Lô trang trại theo giống đang trồng; null = đất trống đã cày, cắm biển chờ chọn giống. */
function buildPlotBody(def: Extract<StationDef, { kind: 'plot' }> | null, w: number, d: number): THREE.Group {
  const group = new THREE.Group();
  if (!def) {
    const soil = box(w, 0.12, d, 0x7a5532);
    soil.position.y = 0.06;
    group.add(soil);
    for (let i = 0; i < 4; i++) {
      const furrow = box(w * 0.9, 0.04, 0.12, 0x5e3f24);
      furrow.position.set(0, 0.14, (i - 1.5) * (d / 4.4));
      group.add(furrow);
    }
    const stake = box(0.05, 0.6, 0.05, 0x8a5a2b);
    stake.position.set(-w * 0.35, 0.4, d * 0.3);
    const board = box(0.42, 0.26, 0.03, 0xf2e2b8);
    board.position.set(-w * 0.35, 0.72, d * 0.3);
    group.add(stake, board);
    return group;
  }
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
  return group;
}

export interface StationView {
  group: THREE.Group;
  update(s: StationSnap): void;
}

/** Mô hình trạm (máy/bàn/kệ/thu ngân) + các món đang nằm trên đó. Ẩn khi chưa mở (ô trả tiền hiện thay). */
export function createStationView(placed: PlacedStation): StationView {
  const def = getStationDef(placed.def);
  const group = new THREE.Group();
  let plotBody: THREE.Group | null = null;
  let cropKey: string | null = def.kind === 'plot' ? def.id : null;
  let cropDef: Extract<StationDef, { kind: 'plot' }> | null = def.kind === 'plot' ? def : null;
  group.position.set(placed.x, 0, placed.z);
  const { w, d } = def.footprint;
  let topY = 0.9;

  let tray: Tray | null = null;
  if (def.kind === 'producer') {
    tray = buildProducer(group, def);
    topY = 1.3;
  } else if (def.kind === 'assembler') {
    tray = buildAssembler(group, def);
  } else if (def.kind === 'display') {
    tray = buildDisplay(group, def);
    topY = 1.0;
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
    plotBody = buildPlotBody(def, w, d);
    group.add(plotBody);
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

  let name = makeLabel(def.name, { color: '#2b2118', bg: 'rgba(255,250,240,.85)', size: 26, scale: 0.006 });
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
      if (def.kind === 'plot') {
        // Lô đổi giống / đất trống mới chọn giống: dựng lại hình lô và tên.
        const crop = s.crop === undefined ? def.id : s.crop;
        if (crop !== cropKey) {
          cropKey = crop;
          const next = crop ? STATIONS[crop] : null;
          cropDef = next?.kind === 'plot' ? next : null;
          if (plotBody) disposeTree(plotBody);
          plotBody = buildPlotBody(cropDef, w, d);
          group.add(plotBody);
          const y = name.position.y;
          disposeLabel(name);
          name.removeFromParent();
          name = makeLabel(cropDef ? cropDef.name : '🌱 Đất trống — chọn giống ở Menu → Trang trại', {
            color: '#2b2118', bg: 'rgba(255,250,240,.9)', size: 26, scale: 0.006,
          });
          name.position.set(0, y, 0);
          group.add(name);
          key = '';
        }
      }
      let items: ItemId[] = [];
      if (def.kind === 'producer') items = Array(s.outputCount).fill(def.output);
      else if (def.kind === 'plot') items = cropDef ? Array(s.outputCount).fill(cropDef.output) : [];
      else if (def.kind === 'display') items = Array(s.stock).fill(def.item);
      else if (def.kind === 'assembler') {
        for (const inp of def.inputs) items.push(...Array<ItemId>(s.inputs[inp.item] ?? 0).fill(inp.item));
        items.push(...Array<ItemId>(s.outputCount).fill(def.output));
      }
      const k = items.join(',');
      if (k === key) return;
      key = k;
      contents.clear();
      contents.add(tray ? itemsOnTray(items, tray, ITEM_STACK_H) : itemGrid(items, w, d, topY));
    },
  };
}

