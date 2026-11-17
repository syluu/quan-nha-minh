export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Góc camera quanh trục đứng: camera đặt ở hướng (sin yaw, cos yaw) so với nhân vật. */
export const CAMERA_YAW = (25 * Math.PI) / 180;

/** "Lên" trên màn hình = đi ra xa camera = -(sin yaw, cos yaw); "phải" = (cos yaw, -sin yaw). */
export function keysToWorld(k: Keys, yaw = CAMERA_YAW): { mx: number; mz: number } {
  const sy = (k.up ? 1 : 0) - (k.down ? 1 : 0);
  const sx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
  if (sx === 0 && sy === 0) return { mx: 0, mz: 0 };
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  let mx = sy * -sin + sx * cos;
  let mz = sy * -cos + sx * -sin;
  const len = Math.hypot(mx, mz);
  mx /= len;
  mz /= len;
  return { mx: Math.abs(mx) < 1e-9 ? 0 : mx, mz: Math.abs(mz) < 1e-9 ? 0 : mz };
}

const KEYMAP: Record<string, keyof Keys> = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createKeyboardInput(): { read(): { mx: number; mz: number }; dispose(): void } {
  const keys: Keys = { up: false, down: false, left: false, right: false };
  const set = (e: KeyboardEvent, v: boolean) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
    keys[k] = v;
    e.preventDefault();
  };
  const down = (e: KeyboardEvent) => set(e, true);
  const up = (e: KeyboardEvent) => set(e, false);
  const blur = () => Object.assign(keys, { up: false, down: false, left: false, right: false });
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return {
    read: () => keysToWorld(keys),
    dispose() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    },
  };
}
