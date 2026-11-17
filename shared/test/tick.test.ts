import { describe, expect, it } from 'vitest';
import { joinPlayer, leavePlayer, setInput } from '../src/sim/players';
import { tick } from '../src/sim/tick';
import type { SimEvent } from '../src/sim/events';
import { createWorld } from '../src/sim/world';
import { getPlaced } from '../src/content';
import { standAt } from './helpers';
import type { PlayerState } from '../src/sim/world';

describe('players', () => {
  it('setInput sanitizes NaN and clamps length to 1', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Bố');
    setInput(w, 'a', { mx: NaN, mz: Infinity });
    expect(w.players.a.input).toEqual({ mx: 0, mz: 0 });
    setInput(w, 'a', { mx: 0, mz: 0, menu: true });
    expect(w.players.a.inMenu).toBe(true);
    setInput(w, 'a', { mx: 0, mz: 0 });
    expect(w.players.a.inMenu).toBe(false);
    setInput(w, 'a', { mx: 3, mz: 4 });
    expect(Math.hypot(w.players.a.input.mx, w.players.a.input.mz)).toBeCloseTo(1);
  });

  it('joinPlayer twice restores the same character with its carry and position', () => {
    const w = createWorld('X', 1);
    const p = joinPlayer(w, 'a', 'Bố');
    p.carry.push('banh_mi');
    p.x = 1.23;
    leavePlayer(w, 'a');
    expect(w.players.a.online).toBe(false);
    const again = joinPlayer(w, 'a', 'Bố');
    expect(Object.keys(w.players)).toEqual(['a']);
    expect(again.online).toBe(true);
    expect(again.carry).toEqual(['banh_mi']);
    expect(again.x).toBe(1.23);
  });
});

describe('leavePlayer', () => {
  it('releases any pay tile the player was on and clears input', () => {
    const w = createWorld('X', 1);
    const p = joinPlayer(w, 'a', 'Bố');
    p.input = { mx: 1, mz: 0 };
    w.shops.banh_mi.stations.chao_op_la.tileOccupant = { playerId: 'a', sec: 1.5 };
    leavePlayer(w, 'a');
    expect(w.shops.banh_mi.stations.chao_op_la.tileOccupant).toBeNull();
    expect(w.players.a.input).toEqual({ mx: 0, mz: 0 });
  });
});

describe('tick', () => {
  it('does nothing while nobody is online', () => {
    const w = createWorld('X', 1);
    expect(tick(w, 10)).toEqual([]);
    expect(w.secOfDay).toBe(0);
    expect(w.money).toBe(5_000_000);
  });

  it('clamps a huge dt to MAX_TICK_DT', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Bố');
    tick(w, 5);
    expect(w.secOfDay).toBeCloseTo(1.0);
  });

  it('writes a log line when someone unlocks a station', () => {
    const w = createWorld('X', 1);
    const p = joinPlayer(w, 'a', 'Mẹ');
    p.x = getPlaced('banh_mi', 'chao_op_la').x;
    p.z = getPlaced('banh_mi', 'chao_op_la').z; // ô Chảo ốp la
    for (let i = 0; i < 80; i++) tick(w, 0.05);
    expect(w.shops.banh_mi.stations.chao_op_la.unlocked).toBe(true);
    expect(w.log.at(-1)?.text).toBe('Mẹ đã mở Chảo ốp la');
  });
});

/** Bot đi theo danh sách điểm, rồi lặp mục tiêu do `next` quyết định. */
function steer(w: ReturnType<typeof createWorld>, p: PlayerState, target: { x: number; z: number }): boolean {
  const dx = target.x - p.x;
  const dz = target.z - p.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) {
    setInput(w, p.id, { mx: 0, mz: 0 });
    return true;
  }
  const s = Math.min(1, d / (p.speed * 0.05));
  setInput(w, p.id, { mx: (dx / d) * s, mz: (dz / d) * s });
  return false;
}

describe('a full day with two bots (Review Focus 2)', () => {
  it('sells bread, ends the day once, and money never goes negative', () => {
    const w = createWorld('X', 42);
    const runner = joinPlayer(w, 'runner', 'Bố');
    const cashier = joinPlayer(w, 'cashier', 'Mẹ');
    // Vào bếp qua khe giữa kệ bánh mì và kệ BM trứng (x = -5.0).
    const runnerPath = [{ x: -5.0, z: 1.8 }, { x: -5.0, z: -1.6 }];
    const cashierPath = [{ x: 7.5, z: standAt('thu_ngan').z }, standAt('thu_ngan')];
    const events: SimEvent[] = [];
    for (let i = 0; i < 7200; i++) {
      if (runnerPath.length) {
        if (steer(w, runner, runnerPath[0])) runnerPath.shift();
      } else {
        steer(w, runner, runner.carry.length === 0 ? standAt('lo_banh_mi') : standAt('ke_banh_mi'));
      }
      if (cashierPath.length && steer(w, cashier, cashierPath[0])) cashierPath.shift();
      events.push(...tick(w, 0.05));
      expect(w.money).toBeGreaterThanOrEqual(0);
    }
    const ends = events.filter((e) => e.type === 'dayEnd');
    expect(ends).toHaveLength(1);
    const summary = ends[0].type === 'dayEnd' ? ends[0].summary : null;
    expect(summary!.revenue).toBeGreaterThan(0);
    expect(summary!.served).toBeGreaterThanOrEqual(20);
  });
});
