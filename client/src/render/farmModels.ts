import * as THREE from 'three';
import type { ItemId } from '@qnm/shared';
import { markSharedGeometry, mat } from './materials';

// Khối đơn vị dùng chung, co giãn cho từng chi tiết (không giải phóng khi dọn cảnh).
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const SPHERE = new THREE.SphereGeometry(1, 12, 9);
const CONE = new THREE.ConeGeometry(1, 1, 10);
markSharedGeometry(BOX, CYL, SPHERE, CONE);

function p(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: number, s: [number, number, number], pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat(color));
  m.scale.set(...s);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

/** Thùng hàng trang trại — mỗi loại một hình riêng, cao ~0,15 để xếp chồng được. */
export function crateModel(item: ItemId): THREE.Group {
  const g = new THREE.Group();
  switch (item) {
    case 'thung_rau': {
      // Sọt gỗ thưa, mấy bắp cải xanh ló lên.
      for (const y of [0.025, 0.075]) for (const z of [-0.1, 0.1]) p(g, BOX, 0xc89a5c, [0.34, 0.03, 0.02], [0, y, z]);
      for (const x of [-0.16, 0.16]) p(g, BOX, 0xa87a44, [0.02, 0.1, 0.22], [x, 0.05, 0]);
      p(g, BOX, 0xa87a44, [0.34, 0.015, 0.22], [0, 0.008, 0]);
      for (const [x, z] of [[-0.09, -0.04], [0.02, 0.05], [0.1, -0.03]]) {
        p(g, SPHERE, 0x4f9a43, [0.07, 0.06, 0.07], [x, 0.1, z]);
        p(g, SPHERE, 0x8cc76a, [0.04, 0.035, 0.04], [x, 0.14, z]);
      }
      break;
    }
    case 'bao_bot_mi':
    case 'bao_gao': {
      // Bao vải phồng, buộc miệng, có sọc màu (bột mì đỏ, gạo xanh lá).
      const cloth = item === 'bao_bot_mi' ? 0xf4ecd8 : 0xefe6cc;
      p(g, SPHERE, cloth, [0.16, 0.075, 0.11], [0, 0.075, 0]);
      p(g, CYL, cloth, [0.05, 0.05, 0.05], [0.13, 0.08, 0], [0, 0, Math.PI / 2]);
      p(g, CYL, 0x8a5a2b, [0.055, 0.015, 0.055], [0.11, 0.08, 0], [0, 0, Math.PI / 2]);
      p(g, BOX, item === 'bao_bot_mi' ? 0xc8452c : 0x3f8f3a, [0.12, 0.012, 0.16], [-0.02, 0.145, 0]);
      break;
    }
    case 'khay_trung': {
      // Khay giấy 2 × 3 quả trứng.
      p(g, BOX, 0xc9b28a, [0.3, 0.03, 0.2], [0, 0.015, 0]);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p(g, SPHERE, 0xf2dfb0, [0.04, 0.05, 0.04], [-0.09 + i * 0.09, 0.07, -0.045 + j * 0.09]);
      break;
    }
    case 'thung_thit_lon':
    case 'thung_thit_bo': {
      // Thùng xốp trắng, nắp mở để lộ thịt; thịt bò kèm khúc xương.
      p(g, BOX, 0xf4f6f8, [0.32, 0.1, 0.22], [0, 0.05, 0]);
      p(g, BOX, 0xdfe5ea, [0.28, 0.01, 0.18], [0, 0.101, 0]);
      const meat = item === 'thung_thit_lon' ? 0xe58f8f : 0xa83a3a;
      p(g, BOX, meat, [0.12, 0.04, 0.09], [-0.06, 0.12, -0.02], [0, 0.3, 0]);
      p(g, BOX, meat, [0.1, 0.035, 0.08], [0.06, 0.12, 0.03], [0, -0.2, 0]);
      if (item === 'thung_thit_lon') p(g, BOX, 0xfbe3e3, [0.12, 0.012, 0.03], [-0.06, 0.145, -0.02], [0, 0.3, 0]);
      else {
        p(g, CYL, 0xf3ead8, [0.015, 0.16, 0.015], [0.02, 0.15, -0.06], [0, 0, Math.PI / 2]);
        for (const x of [-0.06, 0.1]) p(g, SPHERE, 0xf3ead8, [0.025, 0.025, 0.025], [x, 0.15, -0.06]);
      }
      break;
    }
  }
  return g;
}

/** Con vật trong chuồng (nhìn chính diện theo +x). */
export function animalModel(kind: 'chuong_ga' | 'chuong_lon' | 'chuong_bo'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'chuong_bo') {
    // Bò sữa: thân trắng đốm đen, đầu, mõm hồng, sừng, 4 chân, đuôi.
    p(g, BOX, 0xf2efe8, [0.62, 0.32, 0.32], [0, 0.42, 0]);
    for (const [x, y, z, sx] of [[-0.12, 0.5, 0.161, 0.16], [0.14, 0.4, -0.161, 0.18], [0.05, 0.585, 0.02, 0.2]]) p(g, BOX, 0x2b2b2b, [sx, 0.1, 0.01], [x, y, z]);
    p(g, BOX, 0xf2efe8, [0.2, 0.2, 0.2], [0.38, 0.55, 0]);
    p(g, BOX, 0xf0a0a8, [0.06, 0.1, 0.16], [0.49, 0.5, 0]);
    for (const z of [-0.07, 0.07]) p(g, CONE, 0xe8dcc0, [0.025, 0.08, 0.025], [0.36, 0.69, z]);
    for (const x of [-0.22, 0.22]) for (const z of [-0.1, 0.1]) p(g, BOX, 0xe8e2d6, [0.07, 0.28, 0.07], [x, 0.14, z]);
    p(g, BOX, 0x2b2b2b, [0.03, 0.22, 0.03], [-0.33, 0.42, 0], [0, 0, 0.3]);
  } else if (kind === 'chuong_lon') {
    // Lợn hồng: thân tròn, mõm, tai, 4 chân ngắn, đuôi xoăn.
    p(g, SPHERE, 0xf0a0a8, [0.3, 0.2, 0.19], [0, 0.3, 0]);
    p(g, SPHERE, 0xf0a0a8, [0.13, 0.13, 0.13], [0.3, 0.34, 0]);
    p(g, CYL, 0xe08090, [0.06, 0.05, 0.06], [0.43, 0.32, 0], [0, 0, Math.PI / 2]);
    for (const z of [-0.07, 0.07]) p(g, CONE, 0xe08090, [0.04, 0.07, 0.03], [0.3, 0.47, z]);
    for (const x of [-0.15, 0.15]) for (const z of [-0.09, 0.09]) p(g, CYL, 0xe08090, [0.04, 0.14, 0.04], [x, 0.07, z]);
    p(g, SPHERE, 0xe08090, [0.03, 0.03, 0.03], [-0.31, 0.38, 0]);
  } else {
    // Gà mái trắng: thân, đầu, mào đỏ, mỏ vàng, chân cam.
    p(g, SPHERE, 0xf7f4ec, [0.12, 0.1, 0.09], [0, 0.17, 0]);
    p(g, SPHERE, 0xf7f4ec, [0.06, 0.06, 0.06], [0.1, 0.28, 0]);
    p(g, BOX, 0xd8261c, [0.05, 0.04, 0.015], [0.1, 0.35, 0]);
    p(g, CONE, 0xf2a01e, [0.02, 0.05, 0.02], [0.17, 0.27, 0], [0, 0, -Math.PI / 2]);
    p(g, BOX, 0xf7f4ec, [0.06, 0.06, 0.03], [-0.13, 0.22, 0], [0, 0, 0.6]);
    for (const z of [-0.035, 0.035]) p(g, CYL, 0xf2a01e, [0.01, 0.1, 0.01], [0, 0.05, z]);
  }
  return g;
}

/** Cây trên ruộng theo giống: bắp cải, lúa mì bông vàng, lúa thân xanh rủ bông. */
export function cropPlant(kind: 'ruong_rau' | 'ruong_lua_mi' | 'ruong_lua'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'ruong_rau') {
    p(g, SPHERE, 0x3f8f3a, [0.15, 0.1, 0.15], [0, 0.1, 0]);
    p(g, SPHERE, 0x8cc76a, [0.09, 0.08, 0.09], [0, 0.16, 0]);
    for (let i = 0; i < 4; i++) p(g, BOX, 0x4f9a43, [0.14, 0.015, 0.07], [Math.cos(i * 1.57) * 0.11, 0.07, Math.sin(i * 1.57) * 0.11], [0.4, i * 1.57, 0]);
  } else {
    const ripe = kind === 'ruong_lua_mi';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const x = Math.cos(a) * 0.06;
      const z = Math.sin(a) * 0.06;
      p(g, CYL, ripe ? 0xc9a440 : 0x6fa84a, [0.01, 0.42, 0.01], [x, 0.21, z], [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12]);
      if (ripe) p(g, SPHERE, 0xe0b84a, [0.025, 0.07, 0.025], [x * 1.4, 0.45, z * 1.4]);
      else p(g, SPHERE, 0xd7d48a, [0.02, 0.06, 0.02], [x * 1.8, 0.38, z * 1.8], [0.8, a, 0]);
    }
  }
  return g;
}
