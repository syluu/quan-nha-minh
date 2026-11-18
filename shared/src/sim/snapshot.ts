import { BALANCE, COSTUMES, SHOP_TIERS, festivalOfDay, getStationDef, COSTUME_SLOTS, DEFAULT_OUTFIT, SHOP_IDS, SHOP_META, SHOPS } from '../content';
import { canRent, isShopComplete } from './shops';
import { plotDef } from './farm';
import { catSpot, questProgress, questText, tourBusSpot } from './fun';
import type { ShopId } from '../content';
import type { Snapshot } from '../net/protocol';
import { maxLoan } from './bank';
import { migrateV1toV2, migrateV2toV3, migrateV3toV4, migrateV4toV5, migrateV5toV6, migrateV6toV7, migrateV7toV8, migrateV8toV9, migrateV9toV10, migrateV10toV11 } from './migrate';
import { onlineSnapshot } from './online';
import { sellableStations } from './settlement';
import { isTileVisible } from './payTiles';
import { effectiveStars } from './marketing';
import { energyOf, shopTier } from './life';
import { createWorld } from './world';
import type { WorldState } from './world';

/** Bong bóng cảm xúc của khách: sau khi trả tiền / bỏ về là cảm xúc lúc đó; đang chờ thì theo tình hình. */
function customerMood(c: WorldState['shops'][ShopId]['customers'][number]): string | null {
  if (c.face) return c.face;
  if (c.state === 'eating') return '😋';
  if (c.waited > BALANCE.PATIENCE_SEC * 0.6) return '😤';
  if (c.state === 'atShelf' && c.waited > 3) return '🤔';
  return null;
}

export function toSnapshot(world: WorldState, shopId: ShopId): Snapshot {
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];
  return {
    shopId,
    shops: SHOP_IDS.map((id) => ({
      id, name: SHOP_META[id].name, kind: SHOP_META[id].kind, owned: world.shops[id].owned, complete: world.shops[id].owned && isShopComplete(world, id),
      deposit: SHOP_META[id].deposit, rentPerMonth: SHOP_META[id].rentPerMonth,
    })),
    canRent: canRent(world),
    warehouse: { ...world.warehouse },
    farm: {
      owned: world.shops.farm.owned,
      level: world.shops.farm.farmLevel ?? 0,
      plots: SHOPS.farm.stations
        .filter((p) => getStationDef(p.def).kind === 'plot')
        .map((p) => {
          const st = world.shops.farm.stations[p.instanceId];
          return {
            instanceId: p.instanceId, unlocked: st.unlocked, crop: plotDef(world.shops.farm, p)?.id ?? null, nextCrop: st.nextCrop ?? null,
            outputCount: st.outputCount, running: st.running, enabled: st.enabled, expansion: p.farmExpansion ?? 0,
          };
        }),
    },
    day: world.day,
    secOfDay: world.secOfDay,
    money: world.money,
    stars: effectiveStars(shop),
    players: Object.values(world.players).map((p) => ({
      id: p.id, name: p.name, color: p.color, x: p.x, z: p.z, dir: p.dir, carry: [...p.carry], online: p.online,
      cap: p.carryCap,
      // Đang dọn bàn: vòng tiến trình theo thời gian dọn 1 chỗ.
      pick: Math.min(1, p.pickTimer / (p.pickAt?.startsWith('ban_an_') ? BALANCE.CLEAN_SEC : BALANCE.PICK_INTERVAL)),
      pickAt: p.pickAt,
      carryLevel: p.carryLevel,
      speedLevel: p.speedLevel,
      location: p.location,
      outfit: { ...p.outfit },
      wardrobe: [...p.wardrobe],
      emote: p.emote ?? null,
      boost: (p.boost ?? 0) > 0,
    })),
    fun: {
      combo: shop.combo ?? 0,
      cat: shop.cat ?? 'none',
      catSpot: catSpot(shopId),
      tourBus: (shop.tourBusUntil ?? -1) > world.secOfDay,
      busSpot: tourBusSpot(shopId),
      weather: world.weather ?? 'sun',
      festival: (() => {
        const f = festivalOfDay(world.day);
        return f ? { id: f.id, icon: f.icon, name: f.name } : null;
      })(),
      quests: (world.quests ?? []).map((q) => ({
        text: questText(q), progress: Math.min(q.target, questProgress(world, q)), target: q.target, reward: q.reward,
        done: q.done, failed: !!q.failed, kind: q.kind,
      })),
      badges: [...(world.badges ?? [])],
      today: Object.values(world.dayPlayers ?? {}).map((p) => ({ ...p })),
    },
    staff: shop.staff.map((s) => ({
      id: s.id, name: s.name, role: s.role, item: s.item, x: s.x, z: s.z, dir: s.dir, carry: [...s.carry],
      level: s.level, wageOwed: s.wageOwed, energy: Math.round(energyOf(s)), cheer: (s.cheer ?? 0) > 0,
    })),
    life: {
      tier: shopTier(shop),
      earned: shop.earned ?? 0,
      nextTierAt: SHOP_TIERS[shopTier(shop) + 1]?.min ?? null,
      regulars: (world.regulars ?? []).map((r) => ({ id: r.id, shopId: r.shopId, fav: r.fav, love: r.love, visits: r.visits })),
      party: world.party ? { ...world.party } : null,
    },
    month: world.month,
    daysToMonthEnd: BALANCE.MONTH_DAYS - ((world.day - 1) % BALANCE.MONTH_DAYS),
    campaigns: shop.campaigns.map((c) => ({ ...c })),
    ads: [...shop.ads],
    loans: world.loans.map((l) => ({
      id: l.id, principal: l.principal, remaining: l.totalDue - l.paid, installment: l.installment, monthsLeft: l.monthsLeft,
    })),
    maxLoan: maxLoan(world),
    settlement: world.settlement ? { ...world.settlement } : null,
    sellable: world.settlement
      ? SHOP_IDS.flatMap((id) => sellableStations(world, id).map((x) => ({ shopId: id, ...x })))
      : [],
    online: onlineSnapshot(world, shopId),
    prices: { ...shop.prices },
    customers: shop.customers.map((c) => ({ id: c.id, x: c.x, z: c.z, dir: c.dir, holding: [...c.holding], sitting: c.state === 'eating',
      mood: customerMood(c), tourist: !!c.tourist, regular: c.regular ?? null,
      eat: c.state === 'eating' ? Math.min(1, c.eatTimer / BALANCE.EAT_SEC) : 0 })),
    stations: layout.stations.map((placed) => {
      const st = shop.stations[placed.instanceId];
      return {
        instanceId: st.instanceId, unlocked: st.unlocked, outputCount: st.outputCount, stock: st.stock,
        inputs: { ...st.inputs }, blocked: st.blocked, level: st.level, enabled: st.enabled, seats: [...st.seats],
        ...(getStationDef(placed.def).kind === 'plot' ? { crop: plotDef(shop, placed)?.id ?? null } : {}),
        running: st.running,
      };
    }),
    tiles: layout.stations
      .filter((placed) => isTileVisible(shop, placed))
      .map((placed) => {
        const st = shop.stations[placed.instanceId];
        return { instanceId: placed.instanceId, cost: placed.unlockCost, paid: st.paid, occupantSec: st.tileOccupant?.sec ?? 0 };
      }),
    log: world.log.slice(-5),
  };
}

/** Chuẩn hoá thế giới vừa tải từ DB: nâng version, dọn trạng thái tạm, bổ sung trạm mới thêm vào nội dung. */
export function normalizeLoaded(raw: unknown): WorldState {
  const version = raw && typeof raw === 'object' ? (raw as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 && version !== 10 && version !== 11) throw new Error('UNSUPPORTED_SCHEMA');
  let w: unknown = raw;
  if (version === 1) w = migrateV1toV2(w);
  if (version === 1 || version === 2) w = migrateV2toV3(w);
  if (version !== 4 && version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 && version !== 10 && version !== 11) w = migrateV3toV4(w);
  const code = (w as { code: string }).code;
  const fresh = createWorld(code, 0);
  if (version < 5) w = migrateV4toV5(w, fresh.shops);
  if (version < 6) w = migrateV5toV6(w, fresh.shops);
  if (version < 7) w = migrateV6toV7(w, DEFAULT_OUTFIT);
  if (version < 8) w = migrateV7toV8(w);
  if (version < 9) w = migrateV8toV9(w);
  if (version < 10) w = migrateV9toV10(w);
  if (version < 11) w = migrateV10toV11(w);
  const world = w as WorldState;
  world.deliveredTo ??= [];
  for (const id of Object.keys(fresh.shops) as ShopId[]) {
    const shop = (world.shops[id] ??= fresh.shops[id]);
    for (const [instanceId, st] of Object.entries(fresh.shops[id].stations)) shop.stations[instanceId] ??= st;
    shop.customers = [];
    // Đơn online dở dang và shipper không giữ qua lần tải lại.
    shop.orders = [];
    shop.shipper = null;
    // Phụ bếp gắn món (bản cũ) → phụ bếp đa năng.
    for (const s of shop.staff) if (s.role === 'cook') s.item = null;
    for (const st of Object.values(shop.stations)) {
      st.tileOccupant = null;
      // Khách không giữ qua lần tải lại → chỗ đang có người ngồi thành trống (chỗ bẩn vẫn bẩn).
      st.seats = st.seats.map((x) => (x === 'taken' ? 'free' : x));
    }
  }
  for (const p of Object.values(world.players)) {
    p.online = false;
    p.input = { mx: 0, mz: 0 };
    p.dropCd = 0;
    p.pickTimer = 0;
    p.pickAt = null;
    p.inMenu = false;
    // Dữ liệu trang phục hỏng / món lạ / sai ô / chưa mua → về đồ mặc định của ô đó.
    const wardrobe: unknown[] = Array.isArray(p.wardrobe) ? p.wardrobe : [];
    p.wardrobe = [...new Set(wardrobe.filter((id): id is string => typeof id === 'string' && Object.hasOwn(COSTUMES, id)))];
    const outfit = (p.outfit && typeof p.outfit === 'object' ? p.outfit : {}) as Record<string, unknown>;
    p.outfit = { ...DEFAULT_OUTFIT };
    for (const slot of COSTUME_SLOTS) {
      const id = outfit[slot];
      if (typeof id !== 'string' || !Object.hasOwn(COSTUMES, id)) continue;
      const c = COSTUMES[id];
      if (c.slot === slot && (c.price === 0 || p.wardrobe.includes(id))) p.outfit[slot] = id;
    }
    if (!world.shops[p.location]?.owned) {
      p.location = 'banh_mi';
      p.x = SHOPS.banh_mi.entrance.x;
      p.z = SHOPS.banh_mi.entrance.z;
    }
  }
  return world;
}
