import { describe, expect, it } from 'vitest';
import { getPlaced } from '../src/content';
import { tickCarry } from '../src/sim/carry';
import { tickStations } from '../src/sim/production';
import { normalizeLoaded } from '../src/sim/snapshot';
import { createWorld } from '../src/sim/world';
import { putPlayer, repeat } from './helpers';

function farmWorld() {
  const w = createWorld('X', 1);
  w.shops.farm.owned = true;
  return w;
}

describe('warehouse (plan 6, Review Focus 1)', () => {
  it('a machine takes ingredients from the warehouse for free when there are enough', () => {
    const w = createWorld('X', 1);
    w.warehouse.bot_mi = 3;
    tickStations(w, 'banh_mi', 0.1);
    expect(w.money).toBe(5_000_000);
    expect(w.warehouse.bot_mi).toBe(2);
    expect(w.dayStats.ingredientCost).toBe(0);
  });

  it('pays the market only for what is missing; the warehouse never goes negative', () => {
    const w = createWorld('X', 1);
    w.shops.com_tam.owned = true;
    // Chảo chả trứng cần 1 trứng + 1 thịt lợn: kho có trứng, thiếu thịt.
    w.shops.com_tam.stations.chao_cha.unlocked = true;
    for (const id of ['noi_com', 'lo_suon', 'ban_com_tam_suon']) w.shops.com_tam.stations[id].enabled = false;
    w.warehouse = { trung: 1 };
    tickStations(w, 'com_tam', 0.1);
    expect(w.money).toBe(5_000_000 - 6_000);
    expect(w.warehouse.trung).toBe(0);
    for (let i = 0; i < 5; i++) repeat(5.1, (dt) => tickStations(w, 'com_tam', dt));
    expect(w.warehouse.trung).toBe(0);
    expect(w.shops.com_tam.stations.chao_cha.outputCount).toBeGreaterThan(1);
  });
});

describe('farm plots and the truck', () => {
  it('a plot charges the seed cost per batch and yields one crate after its cycle', () => {
    const w = farmWorld();
    const st = w.shops.farm.stations.ruong_rau;
    tickStations(w, 'farm', 0.1);
    expect(w.money).toBe(5_000_000 - 4_000);
    repeat(40, (dt) => tickStations(w, 'farm', dt));
    expect(st.outputCount).toBe(1);
  });

  it('a player picks a crate at the plot and loading it on the truck fills the warehouse', () => {
    const w = farmWorld();
    w.shops.farm.stations.ruong_rau.outputCount = 2;
    const plot = getPlaced('farm', 'ruong_rau').workPoint;
    const p = putPlayer(w, 'a', plot.x, plot.z, [], 'farm');
    repeat(1, (dt) => tickCarry(w, 'farm', dt));
    expect(p.carry).toEqual(['thung_rau', 'thung_rau']);
    const truck = getPlaced('farm', 'xe_cho_hang').workPoint;
    Object.assign(p, truck);
    p.carry.push('banh_mi'); // món không phải thùng hàng: không bốc lên xe
    repeat(1, (dt) => tickCarry(w, 'farm', dt));
    expect(p.carry).toEqual(['banh_mi']);
    expect(w.warehouse.rau).toBe(20);
  });
});

describe('save v5 → v6 (Review Focus 4)', () => {
  it('adds an unrented farm and an empty warehouse', () => {
    const w = normalizeLoaded(JSON.parse(JSON.stringify(createWorld('ABC-DEF', 1))));
    const raw = JSON.parse(JSON.stringify(w));
    raw.schemaVersion = 5;
    delete raw.warehouse;
    delete raw.shops.farm;
    const loaded = normalizeLoaded(raw);
    expect(loaded.schemaVersion).toBe(6);
    expect(loaded.shops.farm.owned).toBe(false);
    expect(loaded.warehouse).toEqual({});
  });
});
