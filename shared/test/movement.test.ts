import { describe, expect, it } from 'vitest';
import { BALANCE, SHOPS, getStationDef } from '../src/content';
import { movePlayer } from '../src/sim/movement';

const layout = SHOPS.banh_mi;
const solidAll = () => true;
const solidNone = () => false;

describe('movePlayer', () => {
  it('moves speed·dt along the input', () => {
    const r = movePlayer({ x: 0, z: 3, dir: 0 }, { mx: 1, mz: 0 }, 3.2, 0.5, layout, solidAll);
    expect(r.x).toBeCloseTo(1.6);
    expect(r.z).toBeCloseTo(3);
  });

  it('normalizes diagonal input', () => {
    const r = movePlayer({ x: 0, z: 3, dir: 0 }, { mx: 1, mz: 1 }, 2, 0.5, layout, solidAll);
    expect(Math.hypot(r.x, r.z - 3)).toBeCloseTo(1);
  });

  it('stops PLAYER_RADIUS away from a solid station', () => {
    const shelf = layout.stations.find((s) => s.instanceId === 'ke_banh_mi')!;
    const front = shelf.z + getStationDef(shelf.def).footprint.d / 2;
    let pos = { x: shelf.x, z: 2, dir: 0 };
    for (let i = 0; i < 40; i++) pos = movePlayer(pos, { mx: 0, mz: -1 }, 3.2, 0.05, layout, solidAll);
    expect(pos.z).toBeCloseTo(front + BALANCE.PLAYER_RADIUS, 2);
  });

  it('walks over a station that is not solid (locked tile)', () => {
    let pos = { x: 0, z: 2, dir: 0 };
    for (let i = 0; i < 20; i++) pos = movePlayer(pos, { mx: 0, mz: -1 }, 3.2, 0.05, layout, solidNone);
    expect(pos.z).toBeCloseTo(2 - 3.2);
  });

  it('is clamped inside bounds', () => {
    const r = movePlayer({ x: layout.bounds.maxX - 0.5, z: 3, dir: 0 }, { mx: 1, mz: 0 }, 3.2, 1, layout, solidAll);
    expect(r.x).toBeCloseTo(layout.bounds.maxX - BALANCE.PLAYER_RADIUS);
  });

  it('keeps dir when standing still and faces the movement otherwise', () => {
    expect(movePlayer({ x: 0, z: 3, dir: 1.23 }, { mx: 0, mz: 0 }, 3.2, 0.1, layout, solidAll).dir).toBe(1.23);
    expect(movePlayer({ x: 0, z: 3, dir: 0 }, { mx: 1, mz: 0 }, 3.2, 0.1, layout, solidAll).dir).toBeCloseTo(Math.PI / 2);
  });
});
