import * as THREE from 'three';

const cache = new Map<string, THREE.MeshLambertMaterial>();

/** Vật liệu Lambert phẳng dùng chung theo màu (rẻ, hợp kiểu low-poly, không bóng đổ). */
export function mat(color: number, emissive = 0): THREE.MeshLambertMaterial {
  const key = `${color}:${emissive}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, emissive, emissiveIntensity: emissive ? 0.6 : 0 });
    cache.set(key, m);
  }
  return m;
}

/** Hình khối dùng chung (món ăn, ghế…): không giải phóng khi dọn cảnh. */
const sharedGeos = new Set<THREE.BufferGeometry>();
export function markSharedGeometry(...geos: THREE.BufferGeometry[]): void {
  for (const g of geos) sharedGeos.add(g);
}

/** Gỡ một nhánh cảnh và giải phóng hình/vật liệu/ảnh riêng của nó (vật liệu dùng chung theo màu thì giữ). */
export function disposeTree(root: THREE.Object3D): void {
  const cached = new Set<THREE.Material>(cache.values());
  root.traverse((o) => {
    const m = o as THREE.Mesh | THREE.Sprite;
    if (!(m as THREE.Mesh).isMesh && !(m as THREE.Sprite).isSprite) return;
    if ((m as THREE.Mesh).isMesh && !sharedGeos.has(m.geometry)) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mt of mats) {
      if (cached.has(mt)) continue;
      (mt as THREE.MeshBasicMaterial).map?.dispose();
      mt.dispose();
    }
  });
  root.removeFromParent();
}

/** Kính trong (tủ kính, bình trà): dùng chung theo màu/độ trong như mat(). */
export function glassMat(color = 0xdff3ff, opacity = 0.28): THREE.MeshLambertMaterial {
  const key = `glass:${color}:${opacity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false });
    cache.set(key, m);
  }
  return m;
}

export function box(w: number, h: number, d: number, color: number, emissive = 0): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive));
}

/** Chữ vẽ lên canvas làm sprite (nhãn tên, giá, biểu tượng). */
export function makeLabel(text: string, opts: { color?: string; bg?: string; size?: number; scale?: number } = {}): THREE.Sprite {
  const size = opts.size ?? 44;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = `800 ${size}px system-ui, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 28;
  c.width = w;
  c.height = size + 22;
  g.font = `800 ${size}px system-ui, sans-serif`;
  if (opts.bg) {
    g.fillStyle = opts.bg;
    const r = c.height / 2;
    g.beginPath();
    g.roundRect(0, 0, w, c.height, r);
    g.fill();
  }
  g.fillStyle = opts.color ?? '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const scale = opts.scale ?? 0.006;
  sprite.scale.set(w * scale, c.height * scale, 1);
  sprite.renderOrder = 10;
  sprite.userData.text = text;
  return sprite;
}

export function disposeLabel(s: THREE.Sprite): void {
  s.material.map?.dispose();
  s.material.dispose();
}
