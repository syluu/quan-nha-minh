import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMusic } from '../src/audio/music';

/** AudioContext giả: chỉ đếm số nốt được hẹn phát. */
function fakeCtx() {
  const ctx = {
    currentTime: 0,
    started: [] as number[],
    createOscillator() {
      return {
        type: '', frequency: { value: 0 },
        connect: (n: unknown) => n,
        start: (at: number) => ctx.started.push(at),
        stop: () => {},
      };
    },
    createGain() {
      const g = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n: unknown) => n };
      return g;
    },
  };
  return ctx;
}

afterEach(() => vi.useRealTimers());

describe('music scheduler', () => {
  it('does not dump a burst of past notes after the tab was throttled', () => {
    vi.useFakeTimers();
    const ctx = fakeCtx();
    const m = createMusic(ctx as never, {} as never);
    m.start();
    vi.advanceTimersByTime(120);
    const before = ctx.started.length;
    ctx.currentTime = 60; // tab nền 1 phút: setInterval không chạy
    vi.advanceTimersByTime(120);
    const burst = ctx.started.length - before;
    expect(burst).toBeLessThanOrEqual(4);
    expect(Math.min(...ctx.started.slice(before))).toBeGreaterThanOrEqual(60);
    m.stop();
  });
});
