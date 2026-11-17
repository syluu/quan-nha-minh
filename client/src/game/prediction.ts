import { BALANCE, SHOPS, movePlayer } from '@qnm/shared';
import type { Pose } from '@qnm/shared';

const SNAP_DIST = 1.5;
const EASE = 0.1;

/** Dự đoán chuyển động nhân vật của chính mình để phím bấm có phản hồi ngay, rồi kéo dần về vị trí server. */
export function createPredictor() {
  let pose: Pose | null = null;
  return {
    pose(): Pose {
      return pose ?? { x: 0, z: 0, dir: 0 };
    },
    ready(): boolean {
      return pose !== null;
    },
    step(input: { mx: number; mz: number }, dt: number, solid: (id: string) => boolean): Pose {
      if (!pose) return { x: 0, z: 0, dir: 0 };
      pose = movePlayer(pose, input, BALANCE.PLAYER_SPEED, dt, SHOPS.banh_mi, solid);
      return pose;
    },
    reconcile(server: { x: number; z: number; dir?: number }) {
      if (!pose) {
        pose = { x: server.x, z: server.z, dir: server.dir ?? 0 };
        return;
      }
      const err = Math.hypot(server.x - pose.x, server.z - pose.z);
      if (err > SNAP_DIST) {
        pose = { ...pose, x: server.x, z: server.z };
      } else {
        pose = { ...pose, x: pose.x + (server.x - pose.x) * EASE, z: pose.z + (server.z - pose.z) * EASE };
      }
    },
  };
}
