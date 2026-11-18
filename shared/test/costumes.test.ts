import { describe, expect, it } from 'vitest';
import { COSTUMES, COSTUME_LIST, DEFAULT_OUTFIT } from '../src/content';
import { buyCostume, wearCostume } from '../src/sim/costumes';
import { joinPlayer } from '../src/sim/players';
import { bankrupt } from '../src/sim/settlement';
import { normalizeLoaded } from '../src/sim/snapshot';
import { createWorld } from '../src/sim/world';

describe('costume catalog (plan 7)', () => {
  it('has hats, shirts (incl. áo dài), pants and aprons priced 200K–5.000K; defaults are free', () => {
    for (const slot of ['hat', 'hair', 'shirt', 'pants', 'apron'] as const) {
      expect(COSTUMES[DEFAULT_OUTFIT[slot]]).toMatchObject({ slot, price: 0 });
      const paid = COSTUME_LIST.filter((c) => c.slot === slot && c.price > 0);
      expect(paid.length, slot).toBeGreaterThanOrEqual(3);
      for (const c of paid) {
        expect(c.price).toBeGreaterThanOrEqual(200_000);
        expect(c.price).toBeLessThanOrEqual(5_000_000);
      }
    }
    // Thay được kiểu dáng, không chỉ màu: đủ các kiểu áo, quần/váy, mũ, tóc.
    const styles = new Set(COSTUME_LIST.map((c) => c.style));
    for (const s of ['ao_phong', 'so_mi', 'ao_khoac', 'ao_dai', 'vay_lien', 'quan_jean', 'quan_short', 'chan_vay', 'mu_len', 'mu_coi', 'toc_dai', 'toc_duoi_ngua', 'toc_bui', 'toc_xoan'])
      expect(styles.has(s as never), s).toBe(true);
  });
});

describe('buying and wearing (Review Focus 1, 4)', () => {
  it('a new player wears the defaults; buying pays from the shared wallet and wears it at once', () => {
    const w = createWorld('X', 1);
    const p = joinPlayer(w, 'a', 'Bố');
    expect(p.outfit).toEqual(DEFAULT_OUTFIT);
    expect(buyCostume(w, 'a', 'mu_dau_bep')).toEqual({ ok: true });
    expect(w.money).toBe(5_000_000 - 1_500_000);
    expect(p.outfit.hat).toBe('mu_dau_bep');
    expect(p.wardrobe).toEqual(['mu_dau_bep']);
    // Mua lại món đã có: không mất tiền, chỉ mặc.
    expect(wearCostume(w, 'a', 'non_la')).toEqual({ ok: true });
    expect(buyCostume(w, 'a', 'mu_dau_bep')).toEqual({ ok: true });
    expect(w.money).toBe(3_500_000);
  });

  it('refuses without money, during settlement, unknown ids; money unchanged', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Bố');
    w.money = 4_999_000;
    expect(buyCostume(w, 'a', 'ao_dai_do')).toEqual({ ok: false, error: 'NO_MONEY' });
    expect(buyCostume(w, 'a', 'constructor')).toEqual({ ok: false, error: 'BAD_ITEM' });
    expect(buyCostume(w, 'a', 42)).toEqual({ ok: false, error: 'BAD_ITEM' });
    w.settlement = { month: 1, revenue: 0, ingredientCost: 0, marketing: 0, commission: 0, wages: 0, rent: 0, loanDue: 0, totalDue: 1 };
    expect(buyCostume(w, 'a', 'ao_do')).toEqual({ ok: false, error: 'PAUSED' });
    expect(w.money).toBe(4_999_000);
    expect(w.players.a.wardrobe).toEqual([]);
  });

  it('each player has their own wardrobe: wearing something only someone else bought is refused', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Bố');
    joinPlayer(w, 'b', 'Mẹ');
    buyCostume(w, 'a', 'ao_hong');
    expect(wearCostume(w, 'b', 'ao_hong')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(w.players.b.outfit.shirt).toBe('ao_mac_dinh');
  });
});

describe('keeping costumes (Review Focus 2, 3)', () => {
  it('bankruptcy keeps what everyone wears and owns', () => {
    const w = createWorld('X', 1);
    joinPlayer(w, 'a', 'Bố');
    buyCostume(w, 'a', 'tap_de_caro');
    bankrupt(w);
    expect(w.players.a.outfit.apron).toBe('tap_de_caro');
    expect(w.players.a.wardrobe).toEqual(['tap_de_caro']);
    expect(w.money).toBe(5_000_000);
  });

  it('save v6 → v7 gives default outfits; unknown items are reset on load', () => {
    const w = createWorld('ABC-DEF', 1);
    joinPlayer(w, 'a', 'Bố');
    const raw = JSON.parse(JSON.stringify(w));
    raw.schemaVersion = 6;
    delete raw.players.a.outfit;
    delete raw.players.a.wardrobe;
    const loaded = normalizeLoaded(raw);
    expect(loaded.schemaVersion).toBe(8);
    expect(loaded.players.a.outfit).toEqual(DEFAULT_OUTFIT);
    loaded.players.a.outfit.hat = 'ao_do'; // sai ô
    loaded.players.a.wardrobe = ['khong_co_mon_nay'];
    const again = normalizeLoaded(JSON.parse(JSON.stringify(loaded)));
    expect(again.players.a.outfit.hat).toBe('non_la');
    expect(again.players.a.wardrobe).toEqual([]);
  });
});

describe('plan 7 review fixes: malformed costume data in saves', () => {
  it.each([
    ['v7 outfit null', 7, null, []],
    ['v7 wardrobe object', 7, { hat: 'non_la' }, {}],
    ['v6 outfit string', 6, 'x', []],
    ['v7 junk wardrobe + unowned hat', 7, { hat: 'mu_phot', shirt: 'ao_do' }, ['__proto__', 'constructor', 'ao_do', 'ao_do', 5]],
  ])('%s loads with sane defaults', (_name, version, outfit, wardrobe) => {
    const w = createWorld('ABC-DEF', 1);
    joinPlayer(w, 'a', 'Bố');
    const raw = JSON.parse(JSON.stringify(w));
    raw.schemaVersion = version;
    raw.players.a.outfit = outfit;
    raw.players.a.wardrobe = wardrobe;
    const loaded = normalizeLoaded(raw);
    const p = loaded.players.a;
    expect(Array.isArray(p.wardrobe)).toBe(true);
    expect(new Set(p.wardrobe).size).toBe(p.wardrobe.length);
    for (const id of p.wardrobe) expect(Object.hasOwn(COSTUMES, id)).toBe(true);
    for (const slot of ['hat', 'hair', 'shirt', 'pants', 'apron'] as const) {
      const c = COSTUMES[p.outfit[slot]];
      expect(c.slot).toBe(slot);
      expect(c.price === 0 || p.wardrobe.includes(c.id)).toBe(true);
    }
  });
});
