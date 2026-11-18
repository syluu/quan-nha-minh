import * as THREE from 'three';
import { ITEMS } from '@qnm/shared';
import type { ItemId } from '@qnm/shared';
import { glassMat, markSharedGeometry, mat } from './materials';
import { crateModel } from './farmModels';

/** Chiều cao mỗi món khi xếp chồng. */
export const ITEM_STACK_H = 0.15;

const loafGeo = new THREE.SphereGeometry(1, 8, 6);
// Ổ bánh mì: hình thoi dài bo tròn hai đầu, có các vết rạch trên lưng.
const baguetteGeo = new THREE.CapsuleGeometry(0.075, 0.24, 4, 10);
const slashGeo = new THREE.BoxGeometry(0.06, 0.012, 0.03);
const leafGeo = new THREE.BoxGeometry(0.4, 0.012, 0.22);
const porkGeo = new THREE.BoxGeometry(0.15, 0.03, 0.09);
const stripeGeo2 = new THREE.BoxGeometry(0.012, 0.006, 0.08);
const herbGeo = new THREE.BoxGeometry(0.03, 0.014, 0.12);
const iceGeo = new THREE.BoxGeometry(0.05, 0.04, 0.05);
const strawGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5);
const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10);
const yolkGeo = new THREE.SphereGeometry(0.06, 8, 6);
const skewerGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
const stickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6);
const chunkGeo = new THREE.DodecahedronGeometry(0.05, 0);
const charGeo = new THREE.BoxGeometry(0.06, 0.012, 0.05);
const onionGeo = new THREE.BoxGeometry(0.025, 0.012, 0.025);
const cupGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.2, 10);
const fillingGeo = new THREE.BoxGeometry(0.4, 0.05, 0.13);
const plateGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.03, 12);
const moundGeo = new THREE.SphereGeometry(0.1, 8, 6);
const bowlGeo = new THREE.CylinderGeometry(0.16, 0.1, 0.12, 12);
const brothGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.01, 12);
const potGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10);
const sliceGeo = new THREE.BoxGeometry(0.22, 0.03, 0.12);
const glassGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.18, 10);
const lumpGeo = new THREE.BoxGeometry(0.2, 0.1, 0.14);
const crateGeo = new THREE.BoxGeometry(0.32, 0.12, 0.22);
const crateTopGeo = new THREE.BoxGeometry(0.28, 0.03, 0.18);
/** Hình dùng chung giữa các món — không được giải phóng khi dọn cảnh. */
export const SHARED_ITEM_GEOS = new Set<THREE.BufferGeometry>([
  iceGeo, strawGeo, loafGeo, baguetteGeo, slashGeo, leafGeo, porkGeo, stripeGeo2, herbGeo, discGeo, yolkGeo, skewerGeo, stickGeo, chunkGeo, charGeo, onionGeo, cupGeo, fillingGeo, plateGeo, moundGeo, bowlGeo, brothGeo, potGeo, sliceGeo, glassGeo, lumpGeo, crateGeo, crateTopGeo,
]);
markSharedGeometry(...SHARED_ITEM_GEOS);

/** Ổ bánh mì giòn: vỏ vàng nâu, 3 vết rạch sáng màu trên lưng. */
function loaf(color = ITEMS.banh_mi.color): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(baguetteGeo, mat(color));
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.85);
  body.position.y = 0.06;
  g.add(body);
  for (let i = -1; i <= 1; i++) {
    const cut = new THREE.Mesh(slashGeo, mat(0xf3d9a4));
    cut.position.set(i * 0.1, 0.125, 0);
    cut.rotation.y = 0.6;
    g.add(cut);
  }
  return g;
}

/** Bánh mì kẹp: ổ bánh xẻ dọc, nhân lộ ra trên lưng + rau xanh. */
function sandwich(filling: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(baguetteGeo, mat(ITEMS.banh_mi.color));
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.85);
  body.position.y = 0.06;
  const fill = new THREE.Mesh(fillingGeo, mat(filling));
  fill.scale.set(0.85, 1, 0.55);
  fill.position.y = 0.12;
  const herb = new THREE.Mesh(herbGeo, mat(0x4f9a43));
  herb.position.set(0.08, 0.145, 0);
  herb.rotation.y = 1.2;
  const herb2 = new THREE.Mesh(herbGeo, mat(0x5fb04f));
  herb2.position.set(-0.1, 0.145, 0);
  herb2.rotation.y = 1.9;
  g.add(body, fill, herb, herb2);
  return g;
}

/** Hình 3D đơn giản cho từng món; geometry/material dùng chung nên tạo nhiều không tốn. */
export function createItemMesh(item: ItemId): THREE.Object3D {
  const g = new THREE.Group();
  switch (item) {
    case 'banh_mi':
      g.add(loaf());
      break;
    case 'trung_op': {
      const white = new THREE.Mesh(discGeo, mat(0xfff8e8));
      const yolk = new THREE.Mesh(yolkGeo, mat(0xf2b01e));
      yolk.position.y = 0.03;
      yolk.scale.y = 0.5;
      g.add(white, yolk);
      break;
    }
    case 'thit_nuong': {
      // Thịt nướng than hoa: lá chuối, 3 miếng thịt nướng mật ong bóng, vân cháy vỉ, hành lá rắc trên.
      const leaf = new THREE.Mesh(leafGeo, mat(0x3f8f3a));
      leaf.position.y = 0.006;
      g.add(leaf);
      for (let i = 0; i < 3; i++) {
        const slice = new THREE.Mesh(porkGeo, mat(i === 1 ? 0xa54a22 : 0xb85a2a));
        slice.position.set(-0.11 + i * 0.11, 0.03 + i * 0.012, (i % 2 ? 0.02 : -0.02));
        slice.rotation.set(0, 0.25 - i * 0.25, i === 1 ? 0.12 : -0.08);
        g.add(slice);
        for (let k = -1; k <= 1; k++) {
          const mark = new THREE.Mesh(stripeGeo2, mat(0x3a1a0a));
          mark.position.set(slice.position.x + k * 0.04, slice.position.y + 0.017, slice.position.z);
          mark.rotation.y = slice.rotation.y;
          g.add(mark);
        }
      }
      for (const [x, z] of [[-0.08, 0.04], [0.02, -0.03], [0.12, 0.03]]) {
        const onion = new THREE.Mesh(onionGeo, mat(0x5aa34a));
        onion.position.set(x, 0.075, z);
        g.add(onion);
      }
      break;
    }
    case 'banh_mi_trung':
      g.add(sandwich(0xf2c14e));
      break;
    case 'banh_mi_thit':
      g.add(sandwich(0xa54a22));
      break;
    case 'tra_da': {
      // Cốc trà đá: cốc nhựa trong màu trà, đá viên nổi trên mặt, ống hút.
      const cup = new THREE.Mesh(cupGeo, glassMat(ITEMS.tra_da.color, 0.8));
      cup.position.y = 0.1;
      g.add(cup);
      for (const [x, z] of [[-0.03, 0.02], [0.03, -0.02]]) {
        const ice = new THREE.Mesh(iceGeo, mat(0xf4fbff));
        ice.position.set(x, 0.19, z);
        ice.rotation.y = x * 10;
        g.add(ice);
      }
      const straw = new THREE.Mesh(strawGeo, mat(0xd23b2a));
      straw.position.set(0.03, 0.24, 0);
      straw.rotation.z = -0.25;
      g.add(straw);
      break;
    }
    case 'com': {
      const pot = new THREE.Mesh(potGeo, mat(0xb0b4b8));
      const rice = new THREE.Mesh(moundGeo, mat(ITEMS.com.color));
      pot.position.y = 0.05;
      rice.position.y = 0.12;
      rice.scale.y = 0.5;
      g.add(pot, rice);
      break;
    }
    case 'suon_nuong':
    case 'bo_tai':
      g.add(new THREE.Mesh(sliceGeo, mat(ITEMS[item].color)));
      break;
    case 'cha_trung':
      g.add(new THREE.Mesh(lumpGeo, mat(ITEMS.cha_trung.color)));
      break;
    case 'com_tam_suon':
    case 'com_tam_suon_cha': {
      const plate = new THREE.Mesh(plateGeo, mat(0xf4f1ea));
      const rice = new THREE.Mesh(moundGeo, mat(ITEMS.com.color));
      rice.position.set(-0.05, 0.04, 0);
      rice.scale.y = 0.5;
      const meat = new THREE.Mesh(sliceGeo, mat(ITEMS.suon_nuong.color));
      meat.position.set(0.04, 0.03, 0.02);
      meat.scale.set(0.6, 1, 0.8);
      g.add(plate, rice, meat);
      if (item === 'com_tam_suon_cha') {
        const cha = new THREE.Mesh(lumpGeo, mat(ITEMS.cha_trung.color));
        cha.position.set(0.05, 0.04, -0.05);
        cha.scale.set(0.4, 0.5, 0.4);
        g.add(cha);
      }
      break;
    }
    case 'nuoc_dung':
    case 'banh_pho':
    case 'pho_bo': {
      const bowl = new THREE.Mesh(bowlGeo, mat(item === 'pho_bo' ? 0xf4f1ea : 0xb0b4b8));
      bowl.position.y = 0.06;
      const top = new THREE.Mesh(brothGeo, mat(ITEMS[item].color));
      top.position.y = 0.11;
      g.add(bowl, top);
      if (item === 'pho_bo') {
        const beef = new THREE.Mesh(sliceGeo, mat(ITEMS.bo_tai.color));
        beef.position.y = 0.125;
        beef.scale.set(0.5, 0.5, 0.6);
        g.add(beef);
      }
      break;
    }
    case 'ca_phe_phin':
    case 'ca_phe_sua_da': {
      const glass = new THREE.Mesh(glassGeo, mat(ITEMS[item].color));
      glass.position.y = 0.09;
      g.add(glass);
      break;
    }
    case 'thung_rau':
    case 'bao_bot_mi':
    case 'bao_gao':
    case 'khay_trung':
    case 'thung_thit_lon':
    case 'thung_thit_bo':
      g.add(crateModel(item));
      break;
    default:
      g.add(new THREE.Mesh(lumpGeo, mat(ITEMS[item as ItemId]?.color ?? 0x999999)));
  }
  return g;
}
