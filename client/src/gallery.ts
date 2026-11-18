/**
 * Trang dev: chụp riêng từng mô hình trang trại (thùng hàng, lô theo giống, đất trống, xe chở hàng)
 * bằng đúng code vẽ của game. Mở /gallery.html khi chạy `npm run dev`. Ảnh để ở window.__gallery.
 */
import * as THREE from 'three';
import { ITEMS, getPlaced } from '@qnm/shared';
import type { ItemId, Snapshot } from '@qnm/shared';
import { createItemMesh } from './render/items';
import { createStationView } from './render/stations';

type Shot = { key: string; name: string; dataUrl: string };

const W = 440;
const H = 330;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;

function shoot(obj: THREE.Object3D, dist: number, lookY: number): string {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a7a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 6, 4);
  scene.add(sun, obj);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
  cam.position.set(dist * 0.55, dist * 0.75, dist);
  cam.lookAt(0, lookY, 0);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

function station(def: Snapshot['stations'][number]['instanceId'], over: Partial<Snapshot['stations'][number]>) {
  const placed = { ...getPlaced('farm', def), x: 0, z: 0 };
  const v = createStationView(placed);
  v.group.position.set(0, 0, 0);
  v.update({
    instanceId: placed.instanceId, unlocked: true, outputCount: 0, stock: 0, inputs: {}, blocked: null, level: 0,
    enabled: true, seats: [], ...over,
  });
  // Bỏ nhãn chữ nổi (sprite) cho ảnh gọn.
  v.group.traverse((o) => ((o as THREE.Sprite).isSprite ? (o.visible = false) : 0));
  return v.group;
}

const shots: Shot[] = [];
const crates: ItemId[] = ['thung_rau', 'bao_bot_mi', 'bao_gao', 'khay_trung', 'thung_thit_lon', 'thung_thit_bo'];
for (const it of crates) {
  const m = createItemMesh(it);
  m.scale.setScalar(2.6);
  shots.push({ key: it, name: ITEMS[it].name, dataUrl: shoot(m, 1.6, 0.2) });
}
const crops = [
  ['ruong_rau', 'Ruộng rau'], ['ruong_lua_mi', 'Ruộng lúa mì'], ['ruong_lua', 'Ruộng lúa'],
  ['chuong_ga', 'Chuồng gà'], ['chuong_lon', 'Chuồng lợn'], ['chuong_bo', 'Chuồng bò'],
] as const;
for (const [crop, name] of crops) shots.push({ key: `lo_${crop}`, name: `${name} (có 2 thùng)`, dataUrl: shoot(station('ruong_rau', { crop, outputCount: 2 }), 4.6, 0.2) });
shots.push({ key: 'lo_trong', name: 'Đất trống (chưa chọn giống)', dataUrl: shoot(station('lo_mo_rong_1', { crop: null }), 4.6, 0.2) });
shots.push({ key: 'xe_cho_hang', name: 'Xe chở hàng', dataUrl: shoot(station('xe_cho_hang', {}), 4.4, 0.6) });

const grid = document.getElementById('grid')!;
grid.innerHTML = shots.map((s) => `<figure><img src="${s.dataUrl}" alt="${s.name}"><figcaption>${s.name}</figcaption></figure>`).join('');
Object.assign(window, { __gallery: shots });
