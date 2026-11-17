import * as THREE from 'three';
import { ITEMS } from '@qnm/shared';
import type { ItemId } from '@qnm/shared';
import { markSharedGeometry, mat } from './materials';

/** Chiều cao mỗi món khi xếp chồng. */
export const ITEM_STACK_H = 0.15;

const loafGeo = new THREE.SphereGeometry(1, 8, 6);
const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10);
const yolkGeo = new THREE.SphereGeometry(0.06, 8, 6);
const skewerGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
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
  loafGeo, discGeo, yolkGeo, skewerGeo, cupGeo, fillingGeo, plateGeo, moundGeo, bowlGeo, brothGeo, potGeo, sliceGeo, glassGeo, lumpGeo, crateGeo, crateTopGeo,
]);
markSharedGeometry(...SHARED_ITEM_GEOS);

function loaf(color = ITEMS.banh_mi.color): THREE.Mesh {
  const m = new THREE.Mesh(loafGeo, mat(color));
  m.scale.set(0.27, 0.08, 0.11);
  return m;
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
    case 'thit_nuong':
      g.add(new THREE.Mesh(skewerGeo, mat(ITEMS.thit_nuong.color)));
      break;
    case 'banh_mi_trung':
    case 'banh_mi_thit': {
      const l = loaf();
      const f = new THREE.Mesh(fillingGeo, mat(ITEMS[item].color));
      f.position.y = 0.06;
      g.add(l, f);
      break;
    }
    case 'tra_da': {
      const cup = new THREE.Mesh(cupGeo, mat(ITEMS.tra_da.color));
      cup.position.y = 0.05;
      g.add(cup);
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
    case 'thung_thit_bo': {
      const crate = new THREE.Mesh(crateGeo, mat(0xb08850));
      crate.position.y = 0.06;
      const top = new THREE.Mesh(crateTopGeo, mat(ITEMS[item].color));
      top.position.y = 0.13;
      g.add(crate, top);
      break;
    }
    default:
      g.add(new THREE.Mesh(lumpGeo, mat(ITEMS[item as ItemId]?.color ?? 0x999999)));
  }
  return g;
}
