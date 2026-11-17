import * as THREE from 'three';
import type { ItemId } from '@qnm/shared';
import { ITEM_STACK_H, createItemMesh } from './items';
import { box, disposeLabel, makeLabel, mat } from './materials';

const bodyGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.52, 8);
const headGeo = new THREE.SphereGeometry(0.2, 10, 8);
const hatGeo = new THREE.ConeGeometry(0.4, 0.24, 14);
const hairGeo = new THREE.SphereGeometry(0.21, 10, 8);
const shadowGeo = new THREE.CircleGeometry(0.34, 16);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });

export interface CharacterView {
  group: THREE.Group;
  setPose(x: number, z: number, dir: number, moving: boolean, t: number): void;
  setCarry(items: ItemId[]): void;
  dispose(): void;
}

/** Nhân vật low-poly: người chơi đội nón lá + nhãn tên; khách có tóc. Chồng đồ cầm trước ngực. */
export function createCharacter(color: number, opts: { hat: boolean; name?: string }): CharacterView {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  const legs = box(0.34, 0.3, 0.24, 0x4a3b30);
  legs.position.y = 0.15;
  const body = new THREE.Mesh(bodyGeo, mat(color));
  body.position.y = 0.56;
  const head = new THREE.Mesh(headGeo, mat(0xf1c9a0));
  head.position.y = 0.98;
  const eyeL = box(0.05, 0.05, 0.02, 0x2b2118);
  eyeL.position.set(-0.07, 1.0, 0.19);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  inner.add(legs, body, head, eyeL, eyeR);
  if (opts.hat) {
    const hat = new THREE.Mesh(hatGeo, mat(0xe8d08a));
    hat.position.y = 1.24;
    inner.add(hat);
  } else {
    const hair = new THREE.Mesh(hairGeo, mat(0x2b2118));
    hair.position.set(0, 1.04, -0.02);
    hair.scale.y = 0.7;
    inner.add(hair);
  }

  let label: THREE.Sprite | null = null;
  if (opts.name) {
    label = makeLabel(opts.name, { bg: 'rgba(43,33,24,.8)', size: 34, scale: 0.0075 });
    label.position.y = 1.75;
    group.add(label);
  }

  const stack = new THREE.Group();
  stack.position.set(0, 0.62, 0.36);
  inner.add(stack);
  let carryKey = '';

  return {
    group,
    setPose(x, z, dir, moving, t) {
      group.position.set(x, 0, z);
      inner.rotation.y = dir;
      inner.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.07 : 0;
    },
    setCarry(items) {
      const key = items.join(',');
      if (key === carryKey) return;
      carryKey = key;
      stack.clear();
      items.forEach((it, i) => {
        const m = createItemMesh(it);
        m.position.y = i * ITEM_STACK_H;
        stack.add(m);
      });
    },
    dispose() {
      if (label) disposeLabel(label);
      group.removeFromParent();
    },
  };
}
