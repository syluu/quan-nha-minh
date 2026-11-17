import * as THREE from 'three';
import { ITEMS } from '@qnm/shared';
import type { ItemId, StationDef } from '@qnm/shared';
import { createItemMesh } from './items';
import { glassMat, markSharedGeometry, mat } from './materials';

/** Chỗ đặt món trên trạm (toạ độ trong group của trạm). */
export interface Tray {
  w: number;
  d: number;
  z: number;
  y: number;
}

// Hình dùng chung (không giải phóng khi đổi quán).
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 12, 8);
markSharedGeometry(unitBox, unitCyl, unitSphere);

function part(geo: THREE.BufferGeometry, material: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}
const B = (g: THREE.Group, w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive = 0) =>
  g.add(part(unitBox, mat(color, emissive), w, h, d, x, y + h / 2, z));
const C = (g: THREE.Group, r: number, h: number, color: number, x: number, y: number, z: number, emissive = 0) =>
  g.add(part(unitCyl, mat(color, emissive), r, h, r, x, y + h / 2, z));

const STEEL = 0xbfc5cc;
const STEEL_DARK = 0x6b737c;
const COUNTER = 0xe3e7eb;
const WOOD = 0xc58b4a;
const WOOD_DARK = 0x8a5426;
const COUNTER_H = 0.78;

/** Tủ bếp inox: thân, chân đen, 2 cánh tủ có tay nắm, mặt bàn sáng. Mặt trước hướng +z (phía lối bếp/camera). */
function kitchenCabinet(g: THREE.Group, w: number, d: number) {
  B(g, w * 0.96, 0.08, d * 0.94, 0x3a3f45, 0, 0, 0);
  B(g, w, COUNTER_H - 0.1, d, STEEL, 0, 0.08, 0);
  for (const sx of [-1, 1]) {
    B(g, w * 0.44, 0.5, 0.02, 0xd3d8dd, (sx * w) / 4, 0.18, d / 2);
    B(g, 0.03, 0.16, 0.03, STEEL_DARK, sx * 0.06, 0.42, d / 2 + 0.02);
  }
  B(g, w * 1.03, 0.05, d * 1.03, COUNTER, 0, COUNTER_H - 0.02, 0);
}

/** Bàn gỗ ghép món: mặt bàn dày, 4 chân, kệ dưới. */
function prepTable(g: THREE.Group, w: number, d: number) {
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.07, COUNTER_H, 0.07, WOOD_DARK, (lx * (w - 0.12)) / 2, 0, (lz * (d - 0.12)) / 2);
  B(g, w * 0.92, 0.04, d * 0.88, WOOD_DARK, 0, 0.18, 0);
  B(g, w, 0.07, d, WOOD, 0, COUNTER_H - 0.05, 0);
}

/** Đồ trang trí trên mặt bàn (nửa sau), theo từng máy. */
function topper(g: THREE.Group, id: string, w: number, d: number) {
  const y = COUNTER_H + 0.02;
  const bz = -d * 0.2; // nửa sau mặt bàn
  switch (id) {
    case 'lo_banh_mi': {
      // Lò nướng: thân thép, cửa kính cam rực, tay nắm, ống khói.
      B(g, w * 0.82, 0.48, d * 0.5, 0x59636d, 0, y, bz);
      B(g, w * 0.6, 0.26, 0.02, 0xffa040, 0, y + 0.1, bz + d * 0.25 + 0.01, 0xff7a00);
      B(g, w * 0.5, 0.03, 0.04, 0xd0d4d8, 0, y + 0.4, bz + d * 0.25 + 0.03);
      C(g, 0.06, 0.35, 0x3b3f44, w * 0.3, y + 0.48, bz - 0.05);
      break;
    }
    case 'chao_op_la':
    case 'chao_cha': {
      // Bếp ga + chảo: vòng lửa xanh, chảo đen, cán chảo, món trong chảo.
      B(g, w * 0.7, 0.08, d * 0.5, 0x2b2b2b, 0, y, bz);
      C(g, 0.16, 0.02, 0x3d8bff, 0, y + 0.08, bz, 0x2a6bff);
      C(g, 0.27, 0.06, 0x262626, 0, y + 0.1, bz);
      B(g, 0.32, 0.03, 0.05, 0x5a3a20, 0.4, y + 0.13, bz);
      if (id === 'chao_op_la') {
        C(g, 0.12, 0.012, 0xfff8e8, -0.04, y + 0.16, bz);
        C(g, 0.05, 0.02, 0xf2b01e, -0.04, y + 0.165, bz);
      } else C(g, 0.18, 0.03, 0xe8b84a, 0, y + 0.16, bz);
      break;
    }
    case 'lo_than':
    case 'lo_suon': {
      // Lò than: máng than đỏ rực, vỉ nướng, vài xiên thịt đang nướng.
      B(g, w * 0.86, 0.16, d * 0.5, 0x333333, 0, y, bz);
      B(g, w * 0.78, 0.02, d * 0.42, 0xff5a1a, 0, y + 0.16, bz, 0xff3a00);
      for (let i = 0; i < 6; i++) B(g, 0.015, 0.015, d * 0.46, 0xd0d4d8, -w * 0.36 + i * w * 0.144, y + 0.19, bz);
      for (let i = 0; i < 2; i++) {
        const sk = createItemMesh(id === 'lo_than' ? 'thit_nuong' : 'suon_nuong');
        sk.position.set(-0.2 + i * 0.4, y + 0.22, bz);
        g.add(sk);
      }
      break;
    }
    case 'binh_tra': {
      // Bình trà đá: bình nhựa trong màu trà trên giá, nắp, vòi.
      B(g, w * 0.7, 0.1, d * 0.6, STEEL_DARK, 0, y, bz + 0.05);
      g.add(part(unitCyl, glassMat(0xc8a050, 0.75), 0.2, 0.42, 0.2, 0, y + 0.1 + 0.21, bz + 0.05));
      C(g, 0.21, 0.05, 0x2f6db5, 0, y + 0.52, bz + 0.05);
      B(g, 0.05, 0.05, 0.1, 0x2f6db5, 0, y + 0.16, bz + 0.27);
      break;
    }
    case 'noi_com': {
      // Nồi cơm điện: thân trắng, nắp tròn, đèn đỏ.
      C(g, 0.26, 0.3, 0xf2f2f0, 0, y, bz);
      g.add(part(unitSphere, mat(0xe6e6e2), 0.26, 0.1, 0.26, 0, y + 0.3, bz));
      B(g, 0.05, 0.03, 0.02, 0xff3030, 0, y + 0.2, bz + 0.26, 0xff0000);
      break;
    }
    case 'noi_nuoc_dung': {
      // Nồi nước dùng to trên bếp, hơi nước bốc lên.
      B(g, w * 0.7, 0.08, d * 0.55, 0x2b2b2b, 0, y, bz);
      C(g, 0.3, 0.42, 0xb8bec6, 0, y + 0.08, bz);
      C(g, 0.28, 0.01, 0xc9a26a, 0, y + 0.5, bz);
      for (const [sx, sy] of [[-0.08, 0.62], [0.06, 0.74], [-0.02, 0.86]]) g.add(part(unitSphere, glassMat(0xffffff, 0.45), 0.08, 0.08, 0.08, sx, y + sy, bz));
      break;
    }
    case 'may_banh_pho': {
      // Máy tráng bánh phở: hộp máy, trục lăn, tấm bánh trắng chảy ra.
      B(g, w * 0.7, 0.35, d * 0.45, 0xe0dccf, 0, y, bz - 0.04);
      g.add(part(unitCyl, mat(STEEL), 0.07, w * 0.6, 0.07, 0, y + 0.3, bz + 0.2).rotateZ(Math.PI / 2));
      B(g, w * 0.5, 0.015, 0.3, 0xfaf6ee, 0, y + 0.02, bz + 0.3);
      break;
    }
    case 'thot_bo': {
      // Thớt gỗ tròn + dao + miếng bò.
      C(g, 0.3, 0.07, 0xb07a44, 0, y, bz);
      B(g, 0.32, 0.01, 0.06, 0xd8dde2, 0.08, y + 0.075, bz - 0.1);
      B(g, 0.1, 0.03, 0.04, 0x2b2118, -0.13, y + 0.075, bz - 0.1);
      B(g, 0.18, 0.04, 0.12, 0xb84a4a, -0.05, y + 0.07, bz + 0.06);
      break;
    }
    case 'may_pha_phin': {
      // Máy pha cà phê: thân nâu, 2 phin bạc nhỏ giọt vào ly.
      B(g, w * 0.75, 0.45, d * 0.4, 0x5a3a26, 0, y, bz - 0.06);
      for (const sx of [-0.2, 0.2]) {
        C(g, 0.06, 0.08, 0xd0d4d8, sx, y + 0.18, bz + 0.18);
        g.add(part(unitCyl, glassMat(0x3b2416, 0.8), 0.06, 0.12, 0.06, sx, y + 0.06, bz + 0.18));
      }
      break;
    }
    default:
      B(g, w * 0.7, 0.35, d * 0.45, STEEL_DARK, 0, y, bz);
  }
}

/** Máy làm món: tủ bếp + thiết bị riêng; món làm xong xếp ở nửa trước mặt bàn. */
export function buildProducer(g: THREE.Group, def: Extract<StationDef, { kind: 'producer' }>): Tray {
  const { w, d } = def.footprint;
  if (def.id === 'binh_tra') {
    // Bình trà nhỏ: bàn thấp + bình.
    prepTable(g, w, d);
  } else kitchenCabinet(g, w, d);
  topper(g, def.id, w, d);
  return { w: w * 0.9, d: d * 0.4, z: d * 0.28, y: COUNTER_H + 0.02 };
}

/** Bàn ghép món: bàn gỗ, thớt, các bát nguyên liệu màu theo đầu vào. */
export function buildAssembler(g: THREE.Group, def: Extract<StationDef, { kind: 'assembler' }>): Tray {
  const { w, d } = def.footprint;
  prepTable(g, w, d);
  const y = COUNTER_H + 0.02;
  B(g, w * 0.5, 0.03, d * 0.3, 0xe8d5b0, -w * 0.15, y, -d * 0.22);
  def.inputs.forEach((inp, i) => {
    const x = w * 0.22 + (i - (def.inputs.length - 1) / 2) * 0.17;
    C(g, 0.07, 0.06, 0xf4f1ea, x, y, -d * 0.3);
    C(g, 0.06, 0.02, ITEMS[inp.item].color, x, y + 0.05, -d * 0.3);
  });
  if (def.id === 'quay_ca_phe') C(g, 0.06, 0.12, 0xf4f1ea, w * 0.38, y, -d * 0.05);
  return { w: w * 0.9, d: d * 0.4, z: d * 0.26, y };
}

/** Kệ bày: tủ kính bán hàng — đế gỗ, khung, kính trong, kệ bên trong, dải màu món trên nóc. */
export function buildDisplay(g: THREE.Group, def: Extract<StationDef, { kind: 'display' }>): Tray {
  const { w, d } = def.footprint;
  const baseH = 0.5;
  B(g, w, baseH, d, WOOD, 0, 0, 0);
  B(g, w * 0.92, 0.32, 0.02, 0xd9a76a, 0, 0.09, d / 2);
  B(g, w * 1.02, 0.04, d * 1.02, WOOD_DARK, 0, baseH, 0);
  const glassH = 0.42;
  g.add(part(unitBox, glassMat(0xdff3ff, 0.18), w * 0.96, glassH, d * 0.92, 0, baseH + 0.04 + glassH / 2, 0));
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.03, glassH, 0.03, 0xf2f2f2, (cx * w * 0.96) / 2, baseH + 0.04, (cz * d * 0.92) / 2);
  // Khung nóc mảnh (không đậy kín) để nhìn xuyên kính thấy món bên trong.
  const topY = baseH + 0.04 + glassH;
  for (const sz of [-1, 1]) B(g, w * 1.0, 0.03, 0.04, 0xf2f2f2, 0, topY, (sz * d * 0.92) / 2);
  for (const sx of [-1, 1]) B(g, 0.04, 0.03, d * 0.92, 0xf2f2f2, (sx * w * 0.96) / 2, topY, 0);
  B(g, w * 1.02, 0.07, 0.03, ITEMS[def.item].color, 0, baseH + 0.08 + glassH, d * 0.51);
  return { w: w * 0.86, d: d * 0.8, z: 0, y: baseH + 0.05 };
}

/** Xếp món lên chỗ đặt: theo hàng/cột, đầy thì chồng lớp. */
export function itemsOnTray(items: ItemId[], tray: Tray, stackH: number): THREE.Group {
  const g = new THREE.Group();
  const cols = Math.max(1, Math.floor(tray.w / 0.3));
  const rows = Math.max(1, Math.floor(tray.d / 0.24));
  const perLayer = cols * rows;
  items.forEach((it, i) => {
    const layer = Math.floor(i / perLayer);
    const k = i % perLayer;
    const m = createItemMesh(it);
    m.position.set((k % cols - (cols - 1) / 2) * 0.3, tray.y + 0.05 + layer * stackH, tray.z + (Math.floor(k / cols) - (rows - 1) / 2) * 0.24);
    g.add(m);
  });
  return g;
}
