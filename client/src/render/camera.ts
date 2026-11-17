import type * as THREE from 'three';
import { CAMERA_YAW } from '../input';

const MIN_DIST = 9;
const MAX_DIST = 26;
/** Kéo khung nhìn xa nhân vật tối đa (m). */
const MAX_PAN = 12;

/** Camera nhìn xiên từ phía trước-phải (CAMERA_YAW), đi theo người chơi, lăn chuột để zoom, kéo chuột phải để xem quanh. */
export function createFollowCamera(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
  let dist = 19;
  let tx = 0;
  let tz = 0;
  let px = 0;
  let pz = 0;
  dom.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      dist = Math.min(MAX_DIST, Math.max(MIN_DIST, dist * (e.deltaY > 0 ? 1.1 : 0.9)));
    },
    { passive: false },
  );
  return {
    follow(x: number, z: number, dt: number) {
      const k = Math.min(1, dt * 6);
      tx += (x + px - tx) * k;
      tz += (z + pz - tz) * k;
      const flat = dist * 0.72;
      camera.position.set(tx + flat * Math.sin(CAMERA_YAW), dist * 0.82, tz + flat * Math.cos(CAMERA_YAW));
      camera.lookAt(tx, 0, tz);
    },
    snap(x: number, z: number) {
      tx = x + px;
      tz = z + pz;
    },
    /** Dời điểm nhìn (m) — kéo chuột phải. */
    pan(dx: number, dz: number) {
      px += dx;
      pz += dz;
      const len = Math.hypot(px, pz);
      if (len > MAX_PAN) {
        px = (px / len) * MAX_PAN;
        pz = (pz / len) * MAX_PAN;
      }
    },
    /** Mét trên mỗi pixel ở mặt sàn (xấp xỉ) để kéo khung nhìn đúng tay. */
    metersPerPx(): number {
      const h = dom.clientHeight || window.innerHeight;
      return (dist * 1.2 * Math.tan(((camera.fov / 2) * Math.PI) / 180) * 2) / h;
    },
    /** Đang xem chỗ khác: nhân vật bắt đầu đi thì từ từ quay về. */
    recenter(dt: number) {
      const k = Math.min(1, dt * 3);
      px -= px * k;
      pz -= pz * k;
      if (Math.hypot(px, pz) < 0.01) px = pz = 0;
    },
    isPanned: () => px !== 0 || pz !== 0,
  };
}
