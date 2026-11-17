import * as THREE from 'three';
import { ITEMS } from '@qnm/shared';
import type { ItemId } from '@qnm/shared';
import { mat } from './materials';

/** Chiều cao mỗi món khi xếp chồng. */
export const ITEM_STACK_H = 0.15;

const loafGeo = new THREE.SphereGeometry(1, 8, 6);
const discGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10);
const yolkGeo = new THREE.SphereGeometry(0.06, 8, 6);
const skewerGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
const cupGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.2, 10);
const fillingGeo = new THREE.BoxGeometry(0.4, 0.05, 0.13);

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
  }
  return g;
}
