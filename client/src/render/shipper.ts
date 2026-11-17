import * as THREE from 'three';
import type { Snapshot } from '@qnm/shared';
import { needsText } from '../ui/menu/views';
import { box, disposeLabel, makeLabel, mat } from './materials';

type ShipperSnap = NonNullable<Snapshot['online']['shipper']>;

const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12);
const headGeo = new THREE.SphereGeometry(0.18, 10, 8);
const helmetGeo = new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);

function wheel(x: number, z: number): THREE.Mesh {
  const w = new THREE.Mesh(wheelGeo, mat(0x222222));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.22, z);
  return w;
}

/** Xe máy (shipper ngồi trên, mũ bảo hiểm xanh lá) hoặc ô tô giao hàng. Mặt trước xe hướng +z cục bộ. */
function buildVehicle(kind: 'bike' | 'car'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'bike') {
    const body = box(0.3, 0.3, 1.1, 0x1fa34a);
    body.position.y = 0.45;
    const seat = box(0.3, 0.12, 0.45, 0x222222);
    seat.position.set(0, 0.66, -0.15);
    const box2 = box(0.5, 0.45, 0.45, 0x1fa34a); // thùng giao hàng
    box2.position.set(0, 0.95, -0.45);
    const rider = box(0.34, 0.45, 0.25, 0x1fa34a);
    rider.position.set(0, 0.95, 0.0);
    const head = new THREE.Mesh(headGeo, mat(0xf1c9a0));
    head.position.set(0, 1.32, 0.02);
    const helmet = new THREE.Mesh(helmetGeo, mat(0x16803a));
    helmet.position.set(0, 1.34, 0.02);
    g.add(body, seat, box2, rider, head, helmet, wheel(0, 0.45), wheel(0, -0.45));
  } else {
    const body = box(1.3, 0.55, 2.3, 0xf2f2f2);
    body.position.y = 0.55;
    const cabin = box(1.2, 0.5, 1.1, 0x7fb3d5);
    cabin.position.set(0, 1.05, 0.35);
    const stripe = box(1.32, 0.12, 2.32, 0x1fa34a);
    stripe.position.y = 0.6;
    g.add(body, cabin, stripe, wheel(-0.62, 0.75), wheel(0.62, 0.75), wheel(-0.62, -0.75), wheel(0.62, -0.75));
  }
  return g;
}

/** Shipper đi tới mép phải quán, bong bóng "Cần: …" + số giây còn chờ. */
export function createShipperView(scene: THREE.Scene) {
  let group: THREE.Group | null = null;
  let kind: 'bike' | 'car' | null = null;
  let label: THREE.Sprite | null = null;
  let labelKey = '';
  const pos = new THREE.Vector3();

  function clear() {
    if (label) disposeLabel(label);
    label = null;
    labelKey = '';
    // Giải phóng hình khối riêng của xe (bánh xe, đầu, mũ dùng chung thì giữ lại).
    group?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry !== wheelGeo && m.geometry !== headGeo && m.geometry !== helmetGeo) m.geometry.dispose();
    });
    group?.removeFromParent();
    group = null;
    kind = null;
  }

  return {
    update(s: ShipperSnap | null, dt: number) {
      if (!s) return clear();
      if (!group || kind !== s.vehicle) {
        clear();
        kind = s.vehicle;
        group = new THREE.Group();
        group.add(buildVehicle(s.vehicle));
        group.position.set(s.x, 0, s.z);
        scene.add(group);
      }
      // Kéo mượt về vị trí snapshot (10 lần/giây).
      pos.set(s.x, 0, s.z);
      group.position.lerp(pos, Math.min(1, dt * 10));
      group.rotation.y = s.dir;
      const left = Math.max(0, Math.ceil(s.patience - s.waited));
      const text = s.state === 'waiting' ? `${needsText(s.needs)} · ${left}s` : '';
      const key = `${text}|${left <= 15}`;
      if (key !== labelKey) {
        labelKey = key;
        if (label) {
          group.remove(label);
          disposeLabel(label);
          label = null;
        }
        if (text) {
          label = makeLabel(text, { bg: left <= 15 ? '#c8452c' : '#1f8a3a', size: 32, scale: 0.0075 });
          label.position.y = 2.0;
          group.add(label);
        }
      }
    },
  };
}
