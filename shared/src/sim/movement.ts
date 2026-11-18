import { BALANCE, getStationDef } from '../content';
import type { ShopLayout } from '../content';

export interface Pose {
  x: number;
  z: number;
  dir: number;
}

/** Di chuyển nhân vật (hình tròn) theo input, đẩy ra khỏi trạm cứng và kẹp trong sàn. Dùng chung server + client. */
export function movePlayer(
  pos: Pose,
  input: { mx: number; mz: number },
  speed: number,
  dt: number,
  layout: ShopLayout,
  isSolid: (instanceId: string) => boolean,
): Pose {
  let { mx, mz } = input;
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  if (len === 0) return { ...pos };

  let x = pos.x + mx * speed * dt;
  let z = pos.z + mz * speed * dt;
  const r = BALANCE.PLAYER_RADIUS;

  for (const s of layout.stations) {
    if (!isSolid(s.instanceId)) continue;
    const fp = getStationDef(s.def).footprint;
    const minX = s.x - fp.w / 2;
    const maxX = s.x + fp.w / 2;
    const minZ = s.z - fp.d / 2;
    const maxZ = s.z + fp.d / 2;
    const cx = Math.max(minX, Math.min(x, maxX));
    const cz = Math.max(minZ, Math.min(z, maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d > 1e-9) {
      x = cx + (dx / d) * r;
      z = cz + (dz / d) * r;
    } else {
      // Tâm nằm trong hộp: đẩy ra theo cạnh gần nhất.
      const pushes = [
        { d: x - minX, nx: minX - r, nz: z },
        { d: maxX - x, nx: maxX + r, nz: z },
        { d: z - minZ, nx: x, nz: minZ - r },
        { d: maxZ - z, nx: x, nz: maxZ + r },
      ].sort((a, b) => a.d - b.d);
      x = pushes[0].nx;
      z = pushes[0].nz;
    }
  }

  const b = layout.bounds;
  x = Math.max(b.minX + r, Math.min(x, b.maxX - r));
  z = Math.max(b.minZ + r, Math.min(z, (layout.walkMaxZ ?? b.maxZ) - r));
  return { x, z, dir: Math.atan2(mx, mz) };
}
