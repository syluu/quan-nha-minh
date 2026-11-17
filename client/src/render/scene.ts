import * as THREE from 'three';
import { SHOPS } from '@qnm/shared';
import { box } from './materials';

/** Renderer + cảnh nền (sàn caro, tường, biển hiệu). Không bóng đổ để chạy mượt trên laptop văn phòng. */
export function createScene(container: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9dfcc);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb59a7a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(5, 10, 6);
  scene.add(sun);

  const b = SHOPS.banh_mi.bounds;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const fc = document.createElement('canvas');
  fc.width = w * 32;
  fc.height = d * 32;
  const fg = fc.getContext('2d')!;
  for (let i = 0; i < w; i++)
    for (let j = 0; j < Math.ceil(d); j++) {
      fg.fillStyle = (i + j) % 2 ? '#e6d7bb' : '#efe3cb';
      fg.fillRect(i * 32, j * 32, 32, 32);
    }
  const floorTex = new THREE.CanvasTexture(fc);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  scene.add(floor);

  // Vỉa hè phía trước (khách xếp hàng đứng ngoài sàn quán).
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(w + 4, 7), new THREE.MeshLambertMaterial({ color: 0xc9c2b4 }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(0, -0.01, b.maxZ + 3.5);
  scene.add(walk);

  const wall = box(w, 2.2, 0.3, 0xc9a27a);
  wall.position.set(0, 1.1, b.minZ - 0.15);
  scene.add(wall);
  const base = box(w, 0.25, 0.32, 0xa77f58);
  base.position.set(0, 0.12, b.minZ - 0.15);
  scene.add(base);

  const sc = document.createElement('canvas');
  sc.width = 512;
  sc.height = 104;
  const sg = sc.getContext('2d')!;
  sg.fillStyle = '#c8452c';
  sg.fillRect(0, 0, 512, 104);
  sg.fillStyle = '#fff3d6';
  sg.font = '800 50px system-ui, sans-serif';
  sg.textAlign = 'center';
  sg.textBaseline = 'middle';
  sg.fillText('BÁNH MÌ NÓNG GIÒN', 256, 54);
  const signTex = new THREE.CanvasTexture(sc);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(0, 1.5, b.minZ + 0.02);
  scene.add(sign);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  function resize() {
    const cw = container.clientWidth || window.innerWidth;
    const ch = container.clientHeight || window.innerHeight;
    renderer.setSize(cw, ch, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, resize };
}
