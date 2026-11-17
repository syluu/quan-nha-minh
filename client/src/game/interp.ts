import type { Snapshot } from '@qnm/shared';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function blend<T extends { x: number; z: number; dir: number }>(older: T | undefined, newer: T, t: number): T {
  if (!older) return newer;
  return { ...newer, x: lerp(older.x, newer.x, t), z: lerp(older.z, newer.z, t), dir: lerpAngle(older.dir, newer.dir, t) };
}

/** Vẽ trễ `delayMs` để luôn có 2 snapshot kẹp hai bên → chuyển động mượt dù snapshot chỉ 10 lần/giây. */
export function createInterpolator(delayMs = 100) {
  const buf: { s: Snapshot; at: number }[] = [];
  return {
    /** Bỏ hết snapshot cũ (khi đổi quán: không nội suy giữa hai quán khác nhau). */
    clear() {
      buf.length = 0;
    },
    push(s: Snapshot, at: number) {
      buf.push({ s, at });
      while (buf.length > 20) buf.shift();
    },
    sample(now: number): Snapshot | null {
      if (buf.length === 0) return null;
      const t = now - delayMs;
      let i = buf.length - 1;
      while (i > 0 && buf[i - 1].at > t) i--;
      if (i === 0 || buf[i].at <= t) return buf[buf.length - 1].at <= t ? buf[buf.length - 1].s : buf[i].s;
      const a = buf[i - 1];
      const b = buf[i];
      const k = Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at)));
      const oldPlayers = new Map(a.s.players.map((p) => [p.id, p]));
      const oldCustomers = new Map(a.s.customers.map((c) => [c.id, c]));
      return {
        ...b.s,
        // Người vừa đổi quán: không trượt từ toạ độ ở quán cũ.
        players: b.s.players.map((p) => {
          const o = oldPlayers.get(p.id);
          return blend(o && o.location === p.location ? o : undefined, p, k);
        }),
        customers: b.s.customers.map((c) => blend(oldCustomers.get(c.id), c, k)),
      };
    },
  };
}
