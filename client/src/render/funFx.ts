import * as THREE from 'three';
import { SHOPS, getStationDef } from '@qnm/shared';
import type { ShopId, Snapshot } from '@qnm/shared';
import { box, disposeLabel, disposeTree, makeLabel, markSharedGeometry, mat } from './materials';

/** Máy có khói / hơi / lửa khi đang làm: [màu, cao, nhiều]. */
const SMOKE: Record<string, { color: number; y: number; rate: number; dx?: number; dz?: number }> = {
  lo_banh_mi: { color: 0xd9d4cc, y: 1.75, rate: 2.5, dx: 0.36, dz: -0.25 },
  lo_than: { color: 0x9a9690, y: 1.05, rate: 5 },
  lo_suon: { color: 0x9a9690, y: 1.05, rate: 5 },
  chao_op_la: { color: 0xf4f1ea, y: 1.0, rate: 2.5 },
  chao_cha: { color: 0xf4f1ea, y: 1.0, rate: 2.5 },
  noi_com: { color: 0xffffff, y: 1.2, rate: 2 },
  noi_nuoc_dung: { color: 0xffffff, y: 1.35, rate: 4 },
  may_pha_phin: { color: 0xffffff, y: 1.3, rate: 1.5 },
};
const EMBER_IDS = new Set(['lo_than', 'lo_suon']);

const puffGeo = new THREE.SphereGeometry(1, 8, 6);
const sparkGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
const confettiGeo = new THREE.BoxGeometry(0.08, 0.02, 0.05);
markSharedGeometry(puffGeo, sparkGeo, confettiGeo);

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  grow: number;
  spin?: number;
}

/** Mèo khối: thân cam, đầu, tai, đuôi dựng. */
function catModel(): THREE.Group {
  const g = new THREE.Group();
  const add = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => {
    const m = box(w, h, d, c);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  add(0.4, 0.18, 0.2, 0xe8a04a, 0, 0.2, 0);
  add(0.2, 0.17, 0.18, 0xe8a04a, 0.25, 0.32, 0);
  for (const z of [-0.06, 0.06]) add(0.05, 0.07, 0.04, 0xd8803a, 0.27, 0.43, z);
  for (const z of [-0.05, 0.05]) add(0.03, 0.03, 0.01, 0x2b2118, 0.351, 0.34, z);
  add(0.04, 0.25, 0.04, 0xd8803a, -0.22, 0.38, 0).rotation.z = 0.4;
  for (const x of [-0.13, 0.13]) for (const z of [-0.06, 0.06]) add(0.05, 0.12, 0.05, 0xe8a04a, x, 0.06, z);
  return g;
}

/** Xe buýt du lịch đỗ ở vỉa hè trước quán. */
function busModel(): THREE.Group {
  const g = new THREE.Group();
  const body = box(4.2, 1.6, 1.6, 0xf2c14e);
  body.position.y = 1.15;
  const stripe = box(4.22, 0.25, 1.62, 0x2f6db5);
  stripe.position.y = 0.8;
  g.add(body, stripe);
  for (let i = 0; i < 5; i++) {
    const win = box(0.55, 0.45, 0.02, 0xbfe3ff);
    win.position.set(-1.6 + i * 0.75, 1.45, 0.81);
    g.add(win);
  }
  for (const x of [-1.4, 1.4]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), mat(0x222222));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.35, 0.75);
    g.add(wheel);
  }
  const sign = makeLabel('🚌 Xe du lịch', { bg: '#2f6db5', size: 32, scale: 0.0075 });
  sign.position.set(0, 2.4, 0);
  g.add(sign);
  return g;
}

/**
 * Hiệu ứng sinh động trong quán: khói/hơi/than hồng ở máy đang làm, mèo (hoang ngồi chờ cho ăn / của quán đi dạo),
 * xe buýt đoàn du lịch, pháo giấy khi có tin vui.
 */
export function createFunFx(scene: THREE.Scene) {
  const particles: Particle[] = [];
  const emitAcc = new Map<string, number>();
  let shopKey = '';
  let cat: THREE.Group | null = null;
  let catBubble: THREE.Sprite | null = null;
  let catState = '';
  let bus: THREE.Group | null = null;

  function spawn(mesh: THREE.Mesh, p: Omit<Particle, 'mesh'>) {
    scene.add(mesh);
    particles.push({ mesh, ...p });
  }

  function clearCat() {
    if (cat) disposeTree(cat);
    if (catBubble) {
      catBubble.removeFromParent();
      disposeLabel(catBubble);
    }
    cat = null;
    catBubble = null;
  }

  return {
    /** Pháo giấy bung lên tại một điểm (mở máy mới, xong nhiệm vụ, huy hiệu…). */
    confetti(x: number, z: number, n = 40) {
      const colors = [0xd8261c, 0xf2c14e, 0x2f6db5, 0x3f8f3a, 0xff7ac8, 0xffffff];
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(confettiGeo, mat(colors[i % colors.length]));
        m.position.set(x, 1.2, z);
        const a = Math.random() * Math.PI * 2;
        const v = 1.5 + Math.random() * 2.5;
        spawn(m, { vx: Math.cos(a) * v, vy: 3.5 + Math.random() * 3, vz: Math.sin(a) * v, life: 0, max: 1.8, grow: 0, spin: 8 });
      }
    },
    update(s: Snapshot, dt: number, t: number) {
      const shopId = s.shopId as ShopId;
      if (shopId !== shopKey) {
        shopKey = shopId;
        clearCat();
        catState = '';
        if (bus) disposeTree(bus);
        bus = null;
        for (const p of particles) p.mesh.removeFromParent();
        particles.length = 0;
      }
      const layout = SHOPS[shopId];
      // Khói / hơi từ máy đang làm.
      for (const st of s.stations) {
        if (!st.running) continue;
        const placed = layout.stations.find((p) => p.instanceId === st.instanceId);
        if (!placed) continue;
        const def = getStationDef(placed.def);
        const fx = SMOKE[def.id];
        if (!fx) continue;
        const acc = (emitAcc.get(st.instanceId) ?? 0) + dt * fx.rate;
        let n = Math.floor(acc);
        emitAcc.set(st.instanceId, acc - n);
        while (n-- > 0) {
          const m = new THREE.Mesh(puffGeo, new THREE.MeshLambertMaterial({ color: fx.color, transparent: true, opacity: 0.55, depthWrite: false }));
          m.scale.setScalar(0.06);
          m.position.set(placed.x + (fx.dx ?? 0) + (Math.random() - 0.5) * 0.3, fx.y, placed.z + (fx.dz ?? -0.2) + (Math.random() - 0.5) * 0.2);
          spawn(m, { vx: (Math.random() - 0.5) * 0.15, vy: 0.5 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.15, life: 0, max: 1.6, grow: 0.14 });
          if (EMBER_IDS.has(def.id) && Math.random() < 0.6) {
            const e = new THREE.Mesh(sparkGeo, mat(0xff7a1a, 0xff5a00));
            e.position.set(placed.x + (Math.random() - 0.5) * 0.8, 0.98, placed.z - 0.2 + (Math.random() - 0.5) * 0.3);
            spawn(e, { vx: (Math.random() - 0.5) * 0.4, vy: 0.8 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 0.4, life: 0, max: 0.7, grow: 0 });
          }
        }
      }
      // Cập nhật hạt: bay lên, to dần, mờ dần; pháo giấy rơi theo trọng lực.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.spin) p.vy -= 6 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        if (p.spin) p.mesh.rotation.set(p.life * p.spin, p.life * p.spin * 0.7, 0);
        if (p.grow) p.mesh.scale.setScalar(p.mesh.scale.x + p.grow * dt);
        const m = p.mesh.material as THREE.MeshLambertMaterial;
        if (m.transparent) m.opacity = 0.55 * (1 - p.life / p.max);
        if (p.life >= p.max || p.mesh.position.y < 0) {
          p.mesh.removeFromParent();
          if (m.transparent) m.dispose();
          particles.splice(i, 1);
        }
      }
      // Mèo: hoang thì ngồi ở vỉa hè chờ cho ăn, của quán thì đi dạo quanh quán.
      if (s.fun.cat !== catState) {
        catState = s.fun.cat;
        clearCat();
        if (catState !== 'none') {
          cat = catModel();
          scene.add(cat);
          catBubble = makeLabel(catState === 'stray' ? '🐱 Meo~ (đứng cạnh, cầm đồ ăn để cho ăn)' : '😺 Mèo của quán', {
            bg: 'rgba(255,255,255,.92)', color: '#2b2118', size: 30, scale: 0.006,
          });
          scene.add(catBubble);
        }
      }
      if (cat) {
        const spot = s.fun.catSpot;
        let x = spot.x;
        let z = spot.z;
        let dir = 0;
        if (catState === 'pet') {
          // Đi vòng chậm quanh khu trước quán.
          x = spot.x + 2 + Math.sin(t * 0.25) * 2.5;
          z = spot.z - 1.2 + Math.cos(t * 0.18) * 0.8;
          dir = Math.atan2(Math.cos(t * 0.25) * 0.6, -Math.sin(t * 0.18) * 0.15);
        } else cat.position.y = Math.abs(Math.sin(t * 2)) * 0.03;
        cat.position.x = x;
        cat.position.z = z;
        cat.rotation.y = catState === 'pet' ? dir - Math.PI / 2 : -Math.PI / 2;
        catBubble?.position.set(x, 0.95 + Math.sin(t * 3) * 0.04, z);
      }
      // Xe buýt du lịch.
      if (s.fun.tourBus && !bus) {
        bus = busModel();
        const b = layout.bounds;
        bus.position.set(b.minX + 6, 0, b.maxZ + 2.4);
        scene.add(bus);
      } else if (!s.fun.tourBus && bus) {
        disposeTree(bus);
        bus = null;
      }
    },
  };
}
