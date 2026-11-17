import { describe, expect, it } from 'vitest';
import { tickStations } from '../src/sim/production';
import { createWorld } from '../src/sim/world';

function run(world: ReturnType<typeof createWorld>, seconds: number) {
  const steps = Math.round(seconds / 0.05);
  for (let i = 0; i < steps; i++) tickStations(world, 'banh_mi', 0.05);
}

describe('tickStations', () => {
  it('charges the ingredient cost when a cycle starts and outputs after cycleSec', () => {
    const w = createWorld('X', 1);
    const start = w.money;
    tickStations(w, 'banh_mi', 0.05);
    expect(w.money).toBe(start - 2000);
    expect(w.dayStats.ingredientCost).toBe(2000);
    run(w, 2.95);
    expect(w.shops.banh_mi.stations.lo_banh_mi.outputCount).toBe(1);
  });

  it('stops at outputCap and reports full', () => {
    const w = createWorld('X', 1);
    run(w, 40);
    const lo = w.shops.banh_mi.stations.lo_banh_mi;
    expect(lo.outputCount).toBe(8);
    expect(lo.blocked).toBe('full');
    expect(w.money).toBe(5_000_000 - 8 * 2000);
  });

  it('blocks with no_money and does not charge when money is short', () => {
    const w = createWorld('X', 1);
    w.money = 1000;
    run(w, 5);
    const lo = w.shops.banh_mi.stations.lo_banh_mi;
    expect(lo.blocked).toBe('no_money');
    expect(lo.outputCount).toBe(0);
    expect(w.money).toBe(1000);
  });

  it('assembler waits for inputs, then consumes them and charges rau', () => {
    const w = createWorld('X', 1);
    const st = w.shops.banh_mi.stations;
    st.lo_banh_mi.unlocked = false; // isolate the assembler
    st.ban_bm_trung.unlocked = true;
    run(w, 1);
    expect(st.ban_bm_trung.blocked).toBe('no_input');
    const before = w.money;
    st.ban_bm_trung.inputs = { banh_mi: 1, trung_op: 1 };
    run(w, 2.05);
    expect(st.ban_bm_trung.outputCount).toBe(1);
    expect(st.ban_bm_trung.inputs.banh_mi ?? 0).toBe(0);
    expect(st.ban_bm_trung.inputs.trung_op ?? 0).toBe(0);
    expect(w.money).toBe(before - 1000);
  });

  it('never produces with a locked station', () => {
    const w = createWorld('X', 1);
    run(w, 30);
    expect(w.shops.banh_mi.stations.chao_op_la.outputCount).toBe(0);
  });

  it('never lets money go negative when several machines compete', () => {
    const w = createWorld('X', 1);
    w.shops.banh_mi.stations.chao_op_la.unlocked = true;
    w.money = 2500; // đủ cho lò bánh (2K) hoặc chảo (3K) nhưng không đủ cả hai
    run(w, 0.05);
    expect(w.money).toBeGreaterThanOrEqual(0);
    const running = ['lo_banh_mi', 'chao_op_la'].filter((id) => w.shops.banh_mi.stations[id].running);
    expect(running).toEqual(['lo_banh_mi']);
    expect(w.money).toBe(500);
  });
});
