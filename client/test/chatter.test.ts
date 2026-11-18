import { describe, expect, it } from 'vitest';
import { OWNER_CARRY, OWNER_CROWDED, STAFF_BUSY, STAFF_IDLE, createChatter } from '../src/game/chatter';

/** Chạy n giây với bước 0,1 s; gom các câu đã nói (mỗi câu một lần). */
function run(seconds: number, step: (dt: number) => string | null): string[] {
  const said: string[] = [];
  let last: string | null = null;
  for (let t = 0; t < seconds; t += 0.1) {
    const s = step(0.1);
    if (s && s !== last) said.push(s);
    last = s;
  }
  return said;
}

describe('fun chatter bubbles (owner request)', () => {
  it('a staff member working non-stop complains now and then; a resting one is cheerful', () => {
    const c = createChatter({ rand: () => 0.3 });
    const busy = run(120, (dt) => c.staff('a', dt, true, true));
    expect(busy.length).toBeGreaterThanOrEqual(2);
    expect(busy.length).toBeLessThanOrEqual(5); // thỉnh thoảng thôi
    for (const line of busy) expect(STAFF_BUSY).toContain(line);
    const idle = run(120, (dt) => c.staff('b', dt, false, false));
    expect(idle.length).toBeGreaterThanOrEqual(2);
    for (const line of idle) expect(STAFF_IDLE).toContain(line);
  });

  it('owner lines follow the shop: crowded → hurry up, carrying → coming through', () => {
    const c = createChatter({ rand: () => 0.5 });
    for (const line of run(90, (dt) => c.owner('p', dt, { customers: 12, carrying: false }))) expect(OWNER_CROWDED).toContain(line);
    for (const line of run(90, (dt) => c.owner('q', dt, { customers: 3, carrying: true }))) expect(OWNER_CARRY).toContain(line);
    // Quán bình thường, tay không: không nói gì.
    expect(run(90, (dt) => c.owner('r', dt, { customers: 4, carrying: false }))).toEqual([]);
  });

  it('a line stays up about 3.5 s and waits at least 25 s before the next', () => {
    const c = createChatter({ rand: () => 0 });
    let shownFor = 0;
    let firstAt = -1;
    let secondAt = -1;
    let prev: string | null = null;
    for (let t = 0; t < 70; t += 0.1) {
      const s = c.owner('p', 0.1, { customers: 10, carrying: false });
      if (s) shownFor += 0.1;
      if (s && !prev) firstAt < 0 ? (firstAt = t) : secondAt < 0 && (secondAt = t);
      prev = s;
    }
    expect(firstAt).toBeGreaterThan(0);
    expect(secondAt - firstAt).toBeGreaterThanOrEqual(25);
    expect(shownFor).toBeGreaterThan(5);
  });
});
