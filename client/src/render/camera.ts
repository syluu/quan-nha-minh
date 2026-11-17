import type * as THREE from 'three';
import { CAMERA_YAW } from '../input';

const MIN_DIST = 9;
const MAX_DIST = 26;

/** Camera nhìn xiên từ phía trước-phải (CAMERA_YAW), đi theo người chơi, lăn chuột để zoom. */
export function createFollowCamera(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
  let dist = 19;
  let tx = 0;
  let tz = 0;
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
      tx += (x - tx) * k;
      tz += (z - tz) * k;
      const flat = dist * 0.72;
      camera.position.set(tx + flat * Math.sin(CAMERA_YAW), dist * 0.82, tz + flat * Math.cos(CAMERA_YAW));
      camera.lookAt(tx, 0, tz);
    },
    snap(x: number, z: number) {
      tx = x;
      tz = z;
    },
  };
}
