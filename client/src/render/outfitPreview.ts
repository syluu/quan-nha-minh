import * as THREE from 'three';
import type { Outfit } from '@qnm/shared';
import { createCharacter } from './characters';

export interface OutfitPreview {
  setOutfit(o: Outfit): void;
  dispose(): void;
}

/**
 * Khung xem trước 3D trong tab Trang phục: nhân vật của mình mặc thử bộ đồ, xoay chậm để xem mọi phía.
 * Kéo chuột trái/phải trên khung để tự xoay. Trả về null nếu máy không tạo được WebGL (khi đó chỉ hiện chữ).
 */
export function createOutfitPreview(host: HTMLElement, color: number): OutfitPreview | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  const W = 220;
  const H = 280;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a7a, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.3);
  sun.position.set(2, 4, 3);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshLambertMaterial({ color: 0xe6d7bb }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 20);
  camera.position.set(0, 1.25, 3.4);
  camera.lookAt(0, 0.82, 0);

  const ch = createCharacter(color, { look: 'player' });
  scene.add(ch.group);

  let angle = 0.5;
  let dragging: number | null = null;
  let lastX = 0;
  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => {
    dragging = e.pointerId;
    lastX = e.clientX;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging !== e.pointerId) return;
    angle += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  });
  const stop = () => (dragging = null);
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  let raf = 0;
  let prev = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    if (dragging === null) angle += dt * 0.6;
    ch.setPose(0, 0, angle, false, now / 1000);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setOutfit: (o) => ch.setOutfit(o),
    dispose() {
      cancelAnimationFrame(raf);
      ch.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
