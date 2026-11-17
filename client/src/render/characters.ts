import * as THREE from 'three';
import type { ItemId } from '@qnm/shared';
import { carryBadge } from '../ui/hud';
import { ITEM_STACK_H, createItemMesh } from './items';
import { disposeLabel, makeLabel, mat } from './materials';

// Hình khối dùng chung cho mọi nhân vật (tạo một lần, không rò bộ nhớ khi khách đến/đi).
const bodyGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.52, 8);
const headGeo = new THREE.SphereGeometry(0.2, 10, 8);
const hatGeo = new THREE.ConeGeometry(0.4, 0.24, 14);
const capGeo = new THREE.CylinderGeometry(0.2, 0.21, 0.16, 12);
const hairGeo = new THREE.SphereGeometry(0.21, 10, 8);
const legsGeo = new THREE.BoxGeometry(0.34, 0.3, 0.24);
const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02);
const apronGeo = new THREE.BoxGeometry(0.34, 0.36, 0.04);
const shadowGeo = new THREE.CircleGeometry(0.34, 16);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });

export type CharacterLook = 'player' | 'customer' | 'staff';

export interface CharacterView {
  group: THREE.Group;
  setPose(x: number, z: number, dir: number, moving: boolean, t: number): void;
  setCarry(items: ItemId[], cap?: number): void;
  /** Đổi chữ trên đầu (khi người chơi đổi tên). */
  setName(name: string): void;
  dispose(): void;
}

/**
 * Nhân vật low-poly. Người chơi đội nón lá; nhân viên đội mũ trắng + tạp dề trắng; khách có tóc.
 * Chồng đồ cầm trước ngực; người chơi và nhân viên có nhãn "3/4" số món đang cầm.
 */
export function createCharacter(color: number, opts: { look: CharacterLook; name?: string }): CharacterView {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  const legs = new THREE.Mesh(legsGeo, mat(0x4a3b30));
  legs.position.y = 0.15;
  const body = new THREE.Mesh(bodyGeo, mat(color));
  body.position.y = 0.56;
  const head = new THREE.Mesh(headGeo, mat(0xf1c9a0));
  head.position.y = 0.98;
  const eyeL = new THREE.Mesh(eyeGeo, mat(0x2b2118));
  eyeL.position.set(-0.07, 1.0, 0.19);
  const eyeR = new THREE.Mesh(eyeGeo, mat(0x2b2118));
  eyeR.position.set(0.07, 1.0, 0.19);
  inner.add(legs, body, head, eyeL, eyeR);

  if (opts.look === 'player') {
    const hat = new THREE.Mesh(hatGeo, mat(0xe8d08a));
    hat.position.y = 1.24;
    inner.add(hat);
  } else if (opts.look === 'staff') {
    const cap = new THREE.Mesh(capGeo, mat(0xffffff));
    cap.position.y = 1.15;
    const apron = new THREE.Mesh(apronGeo, mat(0xf4f1ea));
    apron.position.set(0, 0.52, 0.25);
    inner.add(cap, apron);
  } else {
    const hair = new THREE.Mesh(hairGeo, mat(0x2b2118));
    hair.position.set(0, 1.04, -0.02);
    hair.scale.y = 0.7;
    inner.add(hair);
  }

  let label: THREE.Sprite | null = null;
  let currentName = '';
  function setName(name: string) {
    if (name === currentName) return;
    currentName = name;
    if (label) {
      group.remove(label);
      disposeLabel(label);
    }
    label = makeLabel(name, { bg: opts.look === 'staff' ? 'rgba(90,90,90,.85)' : 'rgba(43,33,24,.8)', size: 34, scale: 0.0075 });
    label.position.y = 1.75;
    group.add(label);
  }
  if (opts.name) setName(opts.name);

  const stack = new THREE.Group();
  stack.position.set(0, 0.62, 0.36);
  inner.add(stack);
  let carryKey = '';
  let badge: THREE.Sprite | null = null;
  let badgeKey = '';

  function setBadge(count: number, cap: number) {
    if (opts.look === 'customer') return;
    const b = carryBadge(count, cap);
    const key = `${b.text}|${b.full}`;
    if (key === badgeKey) return;
    badgeKey = key;
    if (badge) {
      group.remove(badge);
      disposeLabel(badge);
      badge = null;
    }
    if (!b.text) return;
    badge = makeLabel(b.text, { bg: b.full ? '#c8452c' : '#1f8a3a', size: 34, scale: 0.0075 });
    badge.position.y = opts.name ? 2.22 : 1.75;
    group.add(badge);
  }

  return {
    group,
    setPose(x, z, dir, moving, t) {
      group.position.set(x, 0, z);
      inner.rotation.y = dir;
      inner.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.07 : 0;
    },
    setName,
    setCarry(items, cap = 4) {
      setBadge(items.length, cap);
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
      if (badge) disposeLabel(badge);
      group.removeFromParent();
    },
  };
}
