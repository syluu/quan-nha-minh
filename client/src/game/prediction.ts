import { BALANCE, SHOPS, movePlayer } from '@qnm/shared';
import type { Pose, ShopId } from '@qnm/shared';

const SNAP_DIST = 1.5;
/** Lệch nhỏ hơn mức này khi đứng yên: coi như trùng, đặt luôn (không thấy được, hết rung). */
const SETTLE_DIST = 0.03;
/** Tốc độ kéo về vị trí máy chủ (1/giây): khi đang đi kéo nhẹ cho khỏi giật lùi, đứng yên kéo nhanh. */
const PULL_MOVING = 1.2;
const PULL_STILL = 8;

/**
 * Dự đoán chuyển động nhân vật của chính mình để phím bấm có phản hồi ngay.
 * Vị trí máy chủ chỉ làm "đích"; mỗi khung hình kéo dần về đích (mượt, không nhảy theo từng snapshot).
 */
export function createPredictor() {
  let pose: Pose | null = null;
  let target: { x: number; z: number } | null = null;
  let shopId: ShopId = 'banh_mi';
  return {
    /** Sang quán khác: dùng bố cục quán đó, chờ vị trí server để đặt lại. */
    reset(id: ShopId) {
      shopId = id;
      pose = null;
      target = null;
    },
    pose(): Pose {
      return pose ?? { x: 0, z: 0, dir: 0 };
    },
    ready(): boolean {
      return pose !== null;
    },
    /** speed: tốc độ thật của nhân vật (đã nâng cấp) — phải giống máy chủ, lệch là rung. */
    step(input: { mx: number; mz: number }, dt: number, solid: (id: string) => boolean, speed: number = BALANCE.PLAYER_SPEED): Pose {
      if (!pose) return { x: 0, z: 0, dir: 0 };
      const moving = Math.hypot(input.mx, input.mz) > BALANCE.STILL_INPUT;
      if (moving) pose = movePlayer(pose, input, speed, dt, SHOPS[shopId], solid);
      if (target) {
        const dx = target.x - pose.x;
        const dz = target.z - pose.z;
        const err = Math.hypot(dx, dz);
        if (err > SNAP_DIST || (!moving && err < SETTLE_DIST)) pose = { ...pose, x: target.x, z: target.z };
        else {
          const k = Math.min(1, dt * (moving ? PULL_MOVING : PULL_STILL));
          pose = { ...pose, x: pose.x + dx * k, z: pose.z + dz * k };
        }
      }
      return pose;
    },
    reconcile(server: { x: number; z: number; dir?: number }) {
      if (!pose) {
        pose = { x: server.x, z: server.z, dir: server.dir ?? 0 };
        target = { x: server.x, z: server.z };
        return;
      }
      target = { x: server.x, z: server.z };
      // Lệch xa (dịch chuyển, đổi quán, mạng chập chờn): đặt luôn.
      if (Math.hypot(server.x - pose.x, server.z - pose.z) > SNAP_DIST) pose = { ...pose, x: server.x, z: server.z };
    },
  };
}
