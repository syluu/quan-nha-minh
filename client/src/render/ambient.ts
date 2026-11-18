import * as THREE from 'three';
import { SHOPS, gameHour } from '@qnm/shared';
import type { ShopId, Snapshot } from '@qnm/shared';
import { box, disposeTree, makeLabel, markSharedGeometry, mat } from './materials';

/** Màu trời, độ sáng theo giờ trong ngày (6:00 → 22:00). */
const SKY: [number, number, number][] = [
  // [giờ, màu trời, độ sáng]
  [6, 0xf3c9a0, 0.75],
  [8, 0xe9dfcc, 1.0],
  [16, 0xe9dfcc, 1.0],
  [18, 0xf0a878, 0.8],
  [19.5, 0x55607e, 0.55],
  [22, 0x2a3048, 0.45],
];

function skyAt(h: number): { color: THREE.Color; light: number } {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0, l0] = SKY[i];
    const [h1, c1, l1] = SKY[i + 1];
    if (h <= h1) {
      const k = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
      return { color: new THREE.Color(c0).lerp(new THREE.Color(c1), k), light: l0 + (l1 - l0) * k };
    }
  }
  return { color: new THREE.Color(SKY[SKY.length - 1][1]), light: SKY[SKY.length - 1][2] };
}

const bikeGeo = new THREE.BoxGeometry(1.0, 0.35, 0.3);
const riderGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
const headGeo = new THREE.SphereGeometry(0.17, 8, 6);
const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10);
const trunkGeo = new THREE.CylinderGeometry(0.1, 0.13, 1.4, 6);
const crownGeo = new THREE.SphereGeometry(0.75, 8, 6);
const legGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
markSharedGeometry(bikeGeo, riderGeo, headGeo, wheelGeo, trunkGeo, crownGeo, legGeo);

const BIKE_COLORS = [0xd8261c, 0x2f6db5, 0x1f1f1f, 0xf2c14e, 0x3f8f3a, 0xffffff];
const SHIRTS = [0x3d7dd8, 0xd8573d, 0x5aa34a, 0x9b59b6, 0xe0a020, 0x2aa3a3];

function bike(i: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bikeGeo, mat(BIKE_COLORS[i % BIKE_COLORS.length]));
  body.position.y = 0.45;
  const rider = new THREE.Mesh(riderGeo, mat(SHIRTS[(i + 2) % SHIRTS.length]));
  rider.position.set(-0.05, 0.9, 0);
  const head = new THREE.Mesh(headGeo, mat(i % 2 ? 0xf2c14e : 0x2f6db5)); // mũ bảo hiểm
  head.position.set(-0.05, 1.3, 0);
  g.add(body, rider, head);
  for (const x of [-0.4, 0.4]) {
    const w = new THREE.Mesh(wheelGeo, mat(0x222222));
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.2, 0);
    g.add(w);
  }
  return g;
}

function walker(i: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(riderGeo, mat(SHIRTS[i % SHIRTS.length]));
  body.position.y = 0.75;
  const head = new THREE.Mesh(headGeo, mat(0xf1c9a0));
  head.position.y = 1.15;
  const hair = new THREE.Mesh(headGeo, mat(0x2b2118));
  hair.scale.set(1.05, 0.6, 1.05);
  hair.position.y = 1.24;
  g.add(body, head, hair);
  for (const z of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(legGeo, mat(0x3a3a48));
    leg.position.set(0, 0.25, z);
    leg.name = 'leg';
    g.add(leg);
  }
  return g;
}

/** Trang trí ngày lễ ở mặt tiền / tường sau. */
function festivalDecor(id: string, shopId: ShopId): THREE.Group {
  const g = new THREE.Group();
  const b = SHOPS[shopId].bounds;
  const back = b.minZ + 0.2;
  if (id === 'tet') {
    // Câu đối đỏ hai bên tường, cây mai vàng ở góc trước-phải, bao lì xì treo.
    for (const [x, text] of [[b.minX + 1.4, 'PHÚC'], [b.maxX - 1.4, 'LỘC']] as const) {
      const s = makeLabel(`🧧 ${text}`, { bg: '#c0262d', color: '#ffe066', size: 46, scale: 0.01 });
      s.position.set(x, 1.6, back);
      g.add(s);
    }
    const trunk = new THREE.Mesh(trunkGeo, mat(0x6b4226));
    trunk.position.set(b.maxX - 1.2, 0.7, b.maxZ - 0.8);
    g.add(trunk);
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(headGeo, mat(0xffd23f, 0x6a5000));
      f.scale.setScalar(0.45);
      const a = (i / 14) * Math.PI * 2;
      f.position.set(b.maxX - 1.2 + Math.cos(a) * 0.55, 1.45 + Math.sin(i * 1.7) * 0.25, b.maxZ - 0.8 + Math.sin(a) * 0.55);
      g.add(f);
    }
  } else if (id === 'trung_thu') {
    // Lồng đèn ông sao vàng đỏ treo dọc tường sau.
    for (let i = 0; i < 8; i++) {
      const s = makeLabel('⭐', { bg: i % 2 ? '#e0302a' : '#f2c14e', color: '#fff', size: 44, scale: 0.008 });
      s.position.set(b.minX + 1.2 + (i * (b.maxX - b.minX - 2.4)) / 7, 2.1 + (i % 2) * 0.15, back);
      g.add(s);
    }
  } else if (id === 'noel') {
    // Cây thông có đèn nhấp nháy ở góc trước-phải.
    const tree = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 10), mat(0x2f7a3a));
    tree.position.set(b.maxX - 1.2, 1.2, b.maxZ - 0.9);
    const star = makeLabel('⭐', { bg: 'rgba(0,0,0,0)', size: 50, scale: 0.008 });
    star.position.set(b.maxX - 1.2, 2.5, b.maxZ - 0.9);
    g.add(tree, star);
    for (let i = 0; i < 12; i++) {
      const l = new THREE.Mesh(headGeo, mat([0xff3030, 0xffd23f, 0x3fa0ff][i % 3], [0xff0000, 0xffb000, 0x0060ff][i % 3]));
      l.scale.setScalar(0.3);
      const y = 0.4 + (i / 12) * 1.6;
      const r = 0.75 * (1 - (y - 0.1) / 2.2);
      l.position.set(b.maxX - 1.2 + Math.cos(i * 2.3) * r, y, b.maxZ - 0.9 + Math.sin(i * 2.3) * r);
      l.name = 'blink';
      g.add(l);
    }
  } else if (id === 'quoc_khanh') {
    // Cờ đỏ sao vàng dọc mặt tiền.
    for (let i = 0; i < 6; i++) {
      const x = b.minX + 1 + (i * (b.maxX - b.minX - 2)) / 5;
      const pole = box(0.05, 2.4, 0.05, 0xd0d4d8);
      pole.position.set(x, 1.2, b.maxZ + 0.4);
      const flag = makeLabel('★', { bg: '#da251d', color: '#ffde00', size: 48, scale: 0.0085 });
      flag.position.set(x + 0.35, 2.15, b.maxZ + 0.4);
      g.add(pole, flag);
    }
  }
  return g;
}

/**
 * Không khí quanh quán: trời sáng / chiều tà / tối theo giờ, mưa rơi, phố có đường nhựa, xe máy chạy, người đi bộ,
 * cây xanh vỉa hè, trang trí ngày lễ. Chỉ để nhìn (không ảnh hưởng luật chơi).
 */
export function createAmbient(scene: THREE.Scene, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight) {
  let shopKey = '';
  let street: THREE.Group | null = null;
  let decor: THREE.Group | null = null;
  let decorKey = '';
  const bikes: THREE.Group[] = [];
  const walkers: THREE.Group[] = [];
  // Mưa: các vạch rơi quanh khung nhìn.
  const RAIN_N = 700;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaecbe8, transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);
  const drops = Array.from({ length: RAIN_N }, () => ({ x: (Math.random() - 0.5) * 40, y: Math.random() * 12, z: (Math.random() - 0.5) * 30 }));

  function buildStreet(shopId: ShopId) {
    if (street) disposeTree(street);
    for (const o of [...bikes, ...walkers]) o.removeFromParent();
    bikes.length = 0;
    walkers.length = 0;
    street = new THREE.Group();
    const b = SHOPS[shopId].bounds;
    const w = b.maxX - b.minX + 30;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.2), new THREE.MeshLambertMaterial({ color: 0x5f5d59 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set((b.minX + b.maxX) / 2, 0.005, b.maxZ + 7.6);
    street.add(road);
    for (let x = b.minX - 14; x < b.maxX + 14; x += 3) {
      const dash = box(1.4, 0.01, 0.12, 0xf4f1ea);
      dash.position.set(x, 0.012, b.maxZ + 7.6);
      street.add(dash);
    }
    for (let x = b.minX - 1; x <= b.maxX + 1; x += 5.5) {
      const trunk = new THREE.Mesh(trunkGeo, mat(0x6b4226));
      trunk.position.set(x, 0.7, b.maxZ + 5.1);
      const crown = new THREE.Mesh(crownGeo, mat(0x3f8f3a));
      crown.position.set(x, 1.8, b.maxZ + 5.1);
      street.add(trunk, crown);
    }
    scene.add(street);
    for (let i = 0; i < 6; i++) {
      const g = bike(i);
      scene.add(g);
      bikes.push(g);
    }
    for (let i = 0; i < 5; i++) {
      const g = walker(i);
      scene.add(g);
      walkers.push(g);
    }
  }

  return {
    update(s: Snapshot, dt: number, t: number, camTarget: { x: number; z: number }) {
      const shopId = s.shopId as ShopId;
      if (shopId !== shopKey) {
        shopKey = shopId;
        buildStreet(shopId);
      }
      const b = SHOPS[shopId].bounds;
      // Trời theo giờ + mưa thì u ám hơn.
      const rainy = s.fun?.weather === 'rain';
      const sky = skyAt(gameHour(s.secOfDay));
      if (rainy) sky.color.lerp(new THREE.Color(0x8a939e), 0.55);
      const k = sky.light * (rainy ? 0.8 : 1);
      (scene.background as THREE.Color | null)?.copy?.(sky.color);
      if (!(scene.background instanceof THREE.Color)) scene.background = sky.color.clone();
      hemi.intensity = 1.6 * Math.max(0.6, k);
      sun.intensity = 1.4 * k;
      sun.color.set(k < 0.7 ? 0x9fb4ff : gameHour(s.secOfDay) > 17 ? 0xffc89a : 0xffffff);
      // Xe máy hai chiều trên đường, người đi bộ trên vỉa hè.
      const span = b.maxX - b.minX + 28;
      bikes.forEach((g, i) => {
        const dir = i % 2 ? 1 : -1;
        const speed = 4 + (i % 3);
        const x = b.minX - 14 + (((t * speed + i * 9.7) % span) + span) % span;
        g.position.set(dir > 0 ? x : b.minX + b.maxX - x, 0, b.maxZ + (dir > 0 ? 8.2 : 9.2));
        g.rotation.y = dir > 0 ? 0 : Math.PI;
      });
      walkers.forEach((g, i) => {
        const dir = i % 2 ? 1 : -1;
        const x = b.minX - 14 + (((t * (0.9 + (i % 3) * 0.25) + i * 7.3) % span) + span) % span;
        g.position.set(dir > 0 ? x : b.minX + b.maxX - x, Math.abs(Math.sin(t * 6 + i)) * 0.04, b.maxZ + (dir > 0 ? 2.6 : 3.4));
        g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.children.forEach((c, j) => c.name === 'leg' && (c.rotation.z = Math.sin(t * 6 + i) * 0.5 * (j % 2 ? 1 : -1)));
      });
      // Mưa rơi quanh chỗ đang nhìn.
      rain.visible = rainy;
      if (rainy) {
        for (let i = 0; i < RAIN_N; i++) {
          const d = drops[i];
          d.y -= dt * 14;
          if (d.y < 0) {
            d.y = 10 + Math.random() * 2;
            d.x = (Math.random() - 0.5) * 40;
            d.z = (Math.random() - 0.5) * 30;
          }
          const x = camTarget.x + d.x;
          const z = camTarget.z + d.z;
          rainPos.set([x, d.y, z, x - 0.05, d.y + 0.45, z], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      // Trang trí ngày lễ.
      const fk = `${shopId}|${s.fun?.festival?.id ?? ''}`;
      if (fk !== decorKey) {
        decorKey = fk;
        if (decor) disposeTree(decor);
        decor = s.fun?.festival && SHOPS[shopId] ? festivalDecor(s.fun.festival.id, shopId) : null;
        if (decor) scene.add(decor);
      }
      if (decor) decor.children.forEach((c, i) => c.name === 'blink' && (c.visible = Math.floor(t * 2 + i) % 2 === 0));
    },
  };
}
