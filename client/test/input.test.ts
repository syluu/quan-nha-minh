import { describe, expect, it } from 'vitest';
import { keysToWorld } from '../src/input';

const none = { up: false, down: false, left: false, right: false };
const S = Math.SQRT1_2;

describe('keysToWorld (camera rotated 45°)', () => {
  it('maps screen-up to world (-√½, -√½)', () => {
    const r = keysToWorld({ ...none, up: true });
    expect(r.mx).toBeCloseTo(-S);
    expect(r.mz).toBeCloseTo(-S);
  });
  it('maps screen-right to world (√½, -√½)', () => {
    const r = keysToWorld({ ...none, right: true });
    expect(r.mx).toBeCloseTo(S);
    expect(r.mz).toBeCloseTo(-S);
  });
  it('up+right goes straight to -z with length 1', () => {
    const r = keysToWorld({ ...none, up: true, right: true });
    expect(r.mx).toBeCloseTo(0);
    expect(r.mz).toBeCloseTo(-1);
  });
  it('no keys or opposite keys → no movement', () => {
    expect(keysToWorld(none)).toEqual({ mx: 0, mz: 0 });
    expect(keysToWorld({ ...none, up: true, down: true })).toEqual({ mx: 0, mz: 0 });
  });
});
