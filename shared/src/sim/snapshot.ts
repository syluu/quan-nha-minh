import { BALANCE, COSTUMES, COSTUME_SLOTS, DEFAULT_OUTFIT, SHOP_IDS, SHOP_META, SHOPS } from '../content';
import { canRent, isShopComplete } from './shops';
import type { ShopId } from '../content';
import type { Snapshot } from '../net/protocol';
import { maxLoan } from './bank';
import { migrateV1toV2, migrateV2toV3, migrateV3toV4, migrateV4toV5, migrateV5toV6, migrateV6toV7, migrateV7toV8 } from './migrate';
import { onlineSnapshot } from './online';
import { sellableStations } from './settlement';
import { isTileVisible } from './payTiles';
import { effectiveStars } from './marketing';
import { createWorld } from './world';
import type { WorldState } from './world';

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
    })),
    staff: shop.staff.map((s) => ({
      id: s.id, name: s.name, role: s.role, item: s.item, x: s.x, z: s.z, dir: s.dir, carry: [...s.carry],
      level: s.level, wageOwed: s.wageOwed,
    })),
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
    customers: shop.customers.map((c) => ({ id: c.id, x: c.x, z: c.z, dir: c.dir, holding: [...c.holding], sitting: c.state === 'eating' })),
    stations: layout.stations.map((placed) => {
      const st = shop.stations[placed.instanceId];
      return {
        instanceId: st.instanceId, unlocked: st.unlocked, outputCount: st.outputCount, stock: st.stock,
        inputs: { ...st.inputs }, blocked: st.blocked, level: st.level, enabled: st.enabled, seats: [...st.seats],
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
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6 && version !== 7 && version !== 8) throw new Error('UNSUPPORTED_SCHEMA');
  let w: unknown = raw;
  if (version === 1) w = migrateV1toV2(w);
  if (version === 1 || version === 2) w = migrateV2toV3(w);
  if (version !== 4 && version !== 5 && version !== 6 && version !== 7 && version !== 8) w = migrateV3toV4(w);
  const code = (w as { code: string }).code;
  const fresh = createWorld(code, 0);
  if (version !== 5 && version !== 6 && version !== 7 && version !== 8) w = migrateV4toV5(w, fresh.shops);
  if (version !== 6 && version !== 7 && version !== 8) w = migrateV5toV6(w, fresh.shops);
  if (version !== 7 && version !== 8) w = migrateV6toV7(w, DEFAULT_OUTFIT);
  if (version !== 8) w = migrateV7toV8(w);
  const world = w as WorldState;
  world.deliveredTo ??= [];
  for (const id of Object.keys(fresh.shops) as ShopId[]) {
    const shop = (world.shops[id] ??= fresh.shops[id]);
    for (const [instanceId, st] of Object.entries(fresh.shops[id].stations)) shop.stations[instanceId] ??= st;
    shop.customers = [];
    // Đơn online dở dang và shipper không giữ qua lần tải lại.
    shop.orders = [];
    shop.shipper = null;
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
