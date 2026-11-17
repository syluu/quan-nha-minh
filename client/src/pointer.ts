import { CAMERA_YAW } from './input';

/** Độ lệch chuột (px) để đạt tốc độ tối đa và vùng chết. */
export const JOY_RADIUS = 60;
export const JOY_DEAD = 8;

/**
 * Đổi độ lệch trên màn hình (sang phải = +sx, xuống dưới = +sy, đơn vị px) thành hướng đi trong thế giới,
 * độ lớn 0..1 (đi chậm khi kéo ít, như cần điều khiển).
 */
export function joystickToWorld(sx: number, sy: number, yaw = CAMERA_YAW): { mx: number; mz: number } {
  const len = Math.hypot(sx, sy);
  if (len < JOY_DEAD) return { mx: 0, mz: 0 };
  const mag = Math.min(1, (len - JOY_DEAD) / (JOY_RADIUS - JOY_DEAD));
  const ux = sx / len;
  const uy = -sy / len; // lên màn hình = đi ra xa camera
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return { mx: (uy * -sin + ux * cos) * mag, mz: (uy * -cos + ux * -sin) * mag };
}

/** Kéo màn hình (px) → dời điểm nhìn trong thế giới sao cho mặt sàn "đi theo" chuột. */
export function dragToWorld(dx: number, dy: number, metersPerPx: number, yaw = CAMERA_YAW): { x: number; z: number } {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  // Sang phải màn hình = (cos, -sin); xuống dưới màn hình = về phía camera = (sin, cos).
  return { x: -(dx * cos + dy * sin) * metersPerPx, z: -(-dx * sin + dy * cos) * metersPerPx };
}

export interface PointerControls {
  /** Hướng đi từ joystick chuột trái; null khi không giữ chuột. */
  joystick(): { mx: number; mz: number } | null;
  setEnabled(on: boolean): void;
  dispose(): void;
}

/**
 * Chuột trên màn chơi:
 * - Giữ chuột trái + kéo: joystick ảo (vòng tròn hiện ở chỗ bấm), kéo xa đi nhanh hơn.
 * - Giữ chuột phải (hoặc giữa) + kéo: kéo khung nhìn xem quanh quán (onPan nhận số px đã kéo).
 */
export function createPointerControls(
  dom: HTMLElement,
  overlayRoot: HTMLElement,
  onPan: (dx: number, dy: number) => void,
): PointerControls {
  let enabled = true;
  let joy: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  let pan: { id: number; x: number; y: number } | null = null;

  const base = document.createElement('div');
  base.className = 'joy';
  base.hidden = true;
  const knob = document.createElement('div');
  knob.className = 'joy-knob';
  base.append(knob);
  overlayRoot.append(base);

  function drawJoy() {
    if (!joy) {
      base.hidden = true;
      return;
    }
    base.hidden = false;
    base.style.left = `${joy.ox}px`;
    base.style.top = `${joy.oy}px`;
    let dx = joy.x - joy.ox;
    let dy = joy.y - joy.oy;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) {
      dx = (dx / len) * JOY_RADIUS;
      dy = (dy / len) * JOY_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  const down = (e: PointerEvent) => {
    if (!enabled) return;
    if (e.button === 0 && !joy) {
      joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      dom.setPointerCapture?.(e.pointerId);
      drawJoy();
      e.preventDefault();
    } else if ((e.button === 2 || e.button === 1) && !pan) {
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY };
      dom.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }
  };
  const move = (e: PointerEvent) => {
    if (joy && e.pointerId === joy.id) {
      joy.x = e.clientX;
      joy.y = e.clientY;
      drawJoy();
    } else if (pan && e.pointerId === pan.id) {
      onPan(e.clientX - pan.x, e.clientY - pan.y);
      pan.x = e.clientX;
      pan.y = e.clientY;
    }
  };
  const up = (e: PointerEvent) => {
    if (joy && e.pointerId === joy.id) {
      joy = null;
      drawJoy();
    }
    if (pan && e.pointerId === pan.id) pan = null;
  };
  const noMenu = (e: Event) => e.preventDefault();
  const reset = () => {
    joy = null;
    pan = null;
    drawJoy();
  };
  dom.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', reset);
  dom.addEventListener('contextmenu', noMenu);
  dom.style.touchAction = 'none';

  return {
    joystick() {
      if (!joy || !enabled) return null;
      return joystickToWorld(joy.x - joy.ox, joy.y - joy.oy);
    },
    setEnabled(on) {
      enabled = on;
      if (!on) reset();
    },
    dispose() {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', reset);
      dom.removeEventListener('contextmenu', noMenu);
      base.remove();
    },
  };
}
