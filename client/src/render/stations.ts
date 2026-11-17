import * as THREE from 'three';
import { getStationDef } from '@qnm/shared';
import type { ItemId, PlacedStation, Snapshot } from '@qnm/shared';
import { ITEM_STACK_H, createItemMesh } from './items';
import { box, makeLabel, mat } from './materials';

type StationSnap = Snapshot['stations'][number];

const LOOK: Record<string, { color: number; h: number }> = {
  lo_banh_mi: { color: 0x9aa3ad, h: 1.0 },
  chao_op_la: { color: 0x5a5a5a, h: 0.85 },
  lo_than: { color: 0x3b3b3b, h: 0.7 },
  binh_tra: { color: 0x6aa0c8, h: 0.8 },
};

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
    const top = box(w * 0.95, 0.05, d * 0.95, def.id === 'lo_than' ? 0xc0392b : 0x5b4636, def.id === 'lo_than' ? 0xff3010 : 0);
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
  name.visible = def.kind !== 'cashier';
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

  const contents = new THREE.Group();
  group.add(contents);
  let key = '';

  return {
    group,
    update(s) {
      group.visible = s.unlocked;
      if (!s.unlocked) return;
      warn.visible = s.blocked === 'no_money';
      let items: ItemId[] = [];
      if (def.kind === 'producer') items = Array(s.outputCount).fill(def.output);
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

