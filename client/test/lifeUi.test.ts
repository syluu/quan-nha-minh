import { describe, expect, it } from 'vitest';
import { SHOP_TIERS } from '@qnm/shared';
import type { Snapshot } from '@qnm/shared';
import { partyView, teaPromptView } from '../src/ui/lifeUi';
import { regularsView } from '../src/ui/menu/regularsTab';
import { createChatter } from '../src/game/chatter';

type Party = NonNullable<Snapshot['life']['party']>;

function snap(over: { party?: Partial<Party> | null; secOfDay?: number; tier?: number; earned?: number } = {}): Snapshot {
  const party = over.party === null ? null : {
    kind: 'cuoi', shopId: 'banh_mi', item: 'banh_mi_thit', qty: 20, delivered: 0, dueSec: 140, offerUntil: 45, reward: 750_000, state: 'offer', ...over.party,
  };
  const tier = over.tier ?? 0;
  return {
    shopId: 'banh_mi',
    secOfDay: over.secOfDay ?? 10,
    players: [{ id: 'me', x: 0, z: 0 }],
    staff: [
      { id: 's1', name: 'Lan', x: 1, z: 0, energy: 20, cheer: false, rest: 0 },
      { id: 's2', name: 'Hùng', x: 0.5, z: 0, energy: 90, cheer: false, rest: 0 },
      { id: 's3', name: 'Mai', x: 3, z: 0, energy: 10, cheer: false },
    ],
    life: {
      tier, earned: over.earned ?? 0, nextTierAt: SHOP_TIERS[tier + 1]?.min ?? null,
      regulars: [{ id: 'co_ba', shopId: 'banh_mi', fav: 'banh_mi_thit', love: 75, visits: 9 }],
      party,
    },
  } as unknown as Snapshot;
}

describe('party alert', () => {
  it('a new offer shows what, when, reward and a countdown to answer', () => {
    const v = partyView(snap())!;
    expect(v.state).toBe('offer');
    expect(v.title).toBe('💒 Tiệc cưới nhà bên');
    expect(v.lines[0]).toBe('Đặt 20 bánh mì thịt ở Xe bánh mì, giao trước 12:13');
    expect(v.lines[1]).toContain('750K');
    expect(v.lines[1]).toContain('0:35');
  });

  it('an accepted order shows progress, turns urgent near the deadline and offers a look at the delivery point', () => {
    const v = partyView(snap({ party: { state: 'active', delivered: 5 }, secOfDay: 120 }))!;
    expect(v.pct).toBe(25);
    expect(v.urgent).toBe(true);
    expect(v.lines[0]).toContain('5/20');
    expect(v.look).toEqual({ x: 7.6, z: -1.85 });
  });

  it('declined orders are hidden; results show briefly', () => {
    expect(partyView(snap({ party: { state: 'declined' } }))).toBeNull();
    expect(partyView(snap({ party: null }))).toBeNull();
    expect(partyView(snap({ party: { state: 'done', delivered: 20, endSec: 90 }, secOfDay: 100 }))!.lines[0]).toContain('750K');
    expect(partyView(snap({ party: { state: 'done', delivered: 20, endSec: 90 }, secOfDay: 111 }))).toBeNull();
    expect(partyView(snap({ party: { state: 'failed', delivered: 3, endSec: 140 }, secOfDay: 150 }))!.lines[0]).toContain('3/20');
    expect(partyView(snap({ party: { state: 'failed', delivered: 3, endSec: 140 }, secOfDay: 200 }))).toBeNull();
  });
});

describe('iced tea prompt', () => {
  it('offers tea to the nearest tired staff member within reach', () => {
    expect(teaPromptView(snap(), 'me')).toEqual({ staffId: 's1', name: 'Lan', energy: 20, resting: false });
    // Thu ngân không cần trà đá; người đang nghỉ vì hết sức thì có.
    const s = snap();
    Object.assign(s.staff[0], { tireless: true });
    Object.assign(s.staff[1], { energy: 100, rest: 12 });
    expect(teaPromptView(s, 'me')).toEqual({ staffId: 's2', name: 'Hùng', energy: 100, resting: true });
    expect(teaPromptView(snap(), 'nobody')).toBeNull();
  });
});

describe('regulars tab', () => {
  it('lists regulars with favourite, closeness and perks, plus the shop tier progress', () => {
    const v = regularsView(snap({ tier: 1, earned: 9_000_000 }));
    expect(v.rows[0]).toMatchObject({ name: 'Cô Ba vé số', fav: 'Bánh mì thịt', level: '❤️ Khách ruột', visits: 9 });
    expect(v.tier).toMatchObject({ name: 'Quán khang trang', pct: 50, bonus: '+5% khách đi bộ' });
    expect(regularsView(snap({ tier: 3, earned: 60_000_000 })).tier).toMatchObject({ next: null, pct: 100 });
  });
});

describe('chatter with staff energy', () => {
  it('a worn-out staff member complains even while standing still; a forced line shows at once', () => {
    let r = 0;
    const c = createChatter({ rand: () => (r = (r + 0.37) % 1) });
    let said: string | null = null;
    for (let i = 0; i < 400 && !said; i++) said = c.staff('a', 0.1, false, false, 10);
    expect(said).toBeTruthy();
    c.say('b', 'Cảm ơn sếp! 🧋');
    expect(c.staff('b', 0.1, false, false, 100)).toBe('Cảm ơn sếp! 🧋');
  });
});

describe('intruder alert', () => {
  it('warns about a thief with a look button, not once he is caught', async () => {
    const { promoAlertsView } = await import('../src/ui/promoAlert');
    const base = { campaigns: [], secOfDay: 50, fun: { combo: 0, cat: 'none' } } as unknown as Snapshot;
    const it = { kind: 'thief', name: '🦹 Tên trộm', x: 1, z: 2, dir: 0, state: 'grabbing', stolen: ['banh_mi', 'banh_mi'], value: 10_000 } as const;
    const v = promoAlertsView({ ...base, intruder: { ...it, stolen: [...it.stolen] } } as Snapshot);
    expect(v[0]).toMatchObject({ key: 'intruder', look: { x: 1, z: 2 } });
    expect(v[0].text).toContain('Có trộm');
    expect(v[0].text).toContain('2/8');
    expect(promoAlertsView({ ...base, intruder: { ...it, stolen: [], state: 'caught' } } as Snapshot)).toEqual([]);
  });
});
