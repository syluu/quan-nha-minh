import { BALANCE, GIFTS, ITEMS, LIFE, PARTIES, REGULARS, SHOP_IDS, SHOP_META, SHOP_TIERS, SHOPS, getStationDef, tierOf } from '../content';
import type { ItemId, ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import type { SimEvent } from './events';
import { addLog, playerName } from './log';
import { isOnSale } from './prices';
import { pushRating } from './rating';
import type { Party, Regular, ShopState, StaffState, WorldState } from './world';
import { nextRandom } from './world';

// ───────────────────────── Sức nhân viên, mời trà đá ─────────────────────────

export function energyOf(s: Pick<StaffState, 'energy'>): number {
  return s.energy ?? LIFE.ENERGY_MAX;
}

/** Thu ngân đứng quầy, không biết mệt. */
export function canTire(s: Pick<StaffState, 'role'>): boolean {
  return s.role !== 'cashier';
}

/** Hệ số tốc độ theo sức: hăng hái (vừa uống trà đá) nhanh hơn, mệt thì chậm 20%. */
export function staffSpeedMult(s: Pick<StaffState, 'energy' | 'cheer'>): number {
  if ((s.cheer ?? 0) > 0) return LIFE.CHEER_SPEED;
  return energyOf(s) < LIFE.TIRED ? LIFE.TIRED_SPEED : 1;
}

/** Đang nghỉ vì hết sức: đếm ngược, hết giờ nghỉ thì hồi đầy sức. Trả về true nếu vẫn đang nghỉ. */
export function tickStaffRest(s: StaffState, dt: number): boolean {
  if (!s.rest) return false;
  s.rest = Math.max(0, s.rest - dt);
  if (s.rest > 0) return true;
  s.energy = LIFE.ENERGY_MAX;
  return false;
}

/** Mỗi bước: đang làm thì mất sức (trừ lúc đang hăng hái), rảnh thì hồi nhanh; hết sức hẳn thì nghỉ 30 giây. */
export function tickStaffEnergy(s: StaffState, working: boolean, dt: number): void {
  if (s.cheer) s.cheer = Math.max(0, s.cheer - dt);
  const e = energyOf(s);
  const next = working ? (s.cheer ? e : e - LIFE.ENERGY_DRAIN * dt) : e + LIFE.ENERGY_RECOVER * dt;
  s.energy = Math.min(LIFE.ENERGY_MAX, Math.max(0, next));
  if (s.energy <= 0) s.rest = LIFE.REST_SEC;
}

/** Mời nhân viên ly trà đá: hồi đầy sức, hăng hái 30 giây. */
export function treatStaff(world: WorldState, shopId: ShopId, staffId: unknown, byPlayerId: string): ActionResult {
  if (world.settlement) return { ok: false, error: 'PAUSED' };
  const s = world.shops[shopId].staff.find((x) => x.id === staffId);
  if (!s) return { ok: false, error: 'NOT_FOUND' };
  if (!canTire(s)) return { ok: false, error: 'BAD_ROLE' };
  if ((s.cheer ?? 0) > 0) return { ok: false, error: 'MAXED' };
  if (world.money < LIFE.TEA_COST) return { ok: false, error: 'NO_MONEY' };
  world.money -= LIFE.TEA_COST;
  world.dayStats.wages += LIFE.TEA_COST;
  s.energy = LIFE.ENERGY_MAX;
  s.rest = 0;
  s.cheer = LIFE.CHEER_SEC;
  addLog(world, `🧋 ${playerName(world, byPlayerId)} mời ${s.name} ly trà đá — khoẻ re, làm hăng hẳn!`);
  return { ok: true };
}

// ───────────────────────── Quán lên đời ─────────────────────────

export function shopTier(shop: Pick<ShopState, 'earned'>): number {
  return tierOf(shop.earned ?? 0);
}

/** Mỗi cấp quán thêm một chút khách đi bộ. */
export function tierTrafficMultiplier(shop: Pick<ShopState, 'earned'>): number {
  return 1 + LIFE.TIER_TRAFFIC * shopTier(shop);
}

/** Cộng doanh thu cộng dồn của quán; lên cấp thì báo. */
export function addEarned(world: WorldState, shopId: ShopId, amount: number): SimEvent[] {
  const shop = world.shops[shopId];
  const before = shopTier(shop);
  shop.earned = (shop.earned ?? 0) + amount;
  const after = shopTier(shop);
  if (after <= before) return [];
  const t = SHOP_TIERS[after];
  addLog(world, `${t.icon} ${SHOP_META[shopId].name} lên đời: ${t.name}!`);
  return [{ type: 'shopTier', shopId, tier: after }];
}

// ───────────────────────── Khách quen ─────────────────────────

function itemsOnSale(world: WorldState, shopId: ShopId): ItemId[] {
  const out: ItemId[] = [];
  for (const p of SHOPS[shopId].stations) {
    const d = getStationDef(p.def);
    if (d.kind === 'display' && ITEMS[d.item].sellable && world.shops[shopId].stations[p.instanceId].unlocked) out.push(d.item);
  }
  return out;
}

function pick<T>(world: WorldState, list: readonly T[]): T {
  return list[Math.floor(nextRandom(world) * list.length)];
}

export function regularDef(id: string) {
  return REGULARS.find((r) => r.id === id);
}

/** Mức tình cảm: 0 = mới quen, 1 = khách quen, 2 = khách ruột. */
export function loveLevel(love: number): 0 | 1 | 2 {
  return love >= LIFE.LOVE_RUOT ? 2 : love >= LIFE.LOVE_QUEN ? 1 : 0;
}

/** Đầu ngày: mỗi quán có thêm khách quen theo thời gian, ai cũng hẹn một giờ ghé quán hôm nay. */
function prepareRegulars(world: WorldState): void {
  for (const shopId of SHOP_IDS) {
    const shop = world.shops[shopId];
    if (!shop.owned || SHOP_META[shopId].kind !== 'shop') continue;
    const items = itemsOnSale(world, shopId);
    if (!items.length) continue;
    const since = Math.max(1, shop.rentedDay || 1);
    const want = Math.min(LIFE.REGULARS_PER_SHOP, 1 + Math.floor((world.day - since) / LIFE.REGULAR_EVERY_DAYS));
    const mine = world.regulars.filter((r) => r.shopId === shopId);
    while (mine.length < want) {
      const free = REGULARS.filter((d) => !world.regulars.some((r) => r.id === d.id));
      if (!free.length) break;
      const r: Regular = { id: pick(world, free).id, shopId, fav: pick(world, items), love: 0, visitAt: 0, visitedDay: 0, visits: 0 };
      world.regulars.push(r);
      mine.push(r);
      addLog(world, `👋 ${regularDef(r.id)!.name} bắt đầu hay ghé ${SHOP_META[shopId].name} — món ruột: ${ITEMS[r.fav].name}`);
    }
    for (const r of mine) {
      if (!items.includes(r.fav)) r.fav = pick(world, items);
      // Ghé trong giờ mở cửa (trước giờ ngừng đón khách).
      r.visitAt = Math.round(20 + nextRandom(world) * 290);
    }
  }
}

/** Khách quen tới giờ ghé thì trả về để sinh khách (mỗi người mỗi ngày một lần). */
export function dueRegulars(world: WorldState, shopId: ShopId): Regular[] {
  return world.regulars.filter((r) => r.shopId === shopId && r.visitedDay !== world.day && world.secOfDay >= r.visitAt);
}

/** Đổi tình cảm của khách quen; qua mốc thì ghi nhật ký và báo. */
export function changeLove(world: WorldState, r: Regular, delta: number, x: number, z: number): SimEvent[] {
  const before = loveLevel(r.love);
  r.love = Math.min(100, Math.max(0, r.love + delta));
  const after = loveLevel(r.love);
  if (after <= before) return [];
  const name = regularDef(r.id)?.name ?? 'Khách';
  const text = after === 2 ? `❤️ ${name} giờ là khách ruột của quán!` : `💛 ${name} giờ là khách quen của quán!`;
  addLog(world, text);
  return [{ type: 'regular', shopId: r.shopId, text, x, z }];
}

/** Khách ruột thỉnh thoảng mang quà tới: +vài lượt chấm 5 sao. */
export function maybeGift(world: WorldState, shop: ShopState, r: Regular, x: number, z: number): SimEvent[] {
  if (loveLevel(r.love) < 2 || nextRandom(world) >= LIFE.GIFT_CHANCE) return [];
  for (let i = 0; i < LIFE.GIFT_RATINGS; i++) pushRating(shop, 5);
  const text = `🎁 ${regularDef(r.id)?.name ?? 'Khách'} tặng quán ${pick(world, GIFTS)}!`;
  addLog(world, text);
  return [{ type: 'regular', shopId: shop.id, text, x, z }];
}

// ───────────────────────── Đơn đặt tiệc ─────────────────────────

function hourToSec(h: number): number {
  return ((h - BALANCE.OPEN_HOUR) / (BALANCE.CLOSE_HOUR - BALANCE.OPEN_HOUR)) * BALANCE.DAY_REAL_SEC;
}

function pickupOpen(world: WorldState, shopId: ShopId): boolean {
  const p = SHOPS[shopId].stations.find((s) => getStationDef(s.def).kind === 'pickup');
  return !!p && world.shops[shopId].stations[p.instanceId].unlocked;
}

function makeParty(world: WorldState): Party | null {
  if (world.day < LIFE.PARTY_FROM_DAY || nextRandom(world) >= LIFE.PARTY_CHANCE) return null;
  const shops = SHOP_IDS.filter((id) => world.shops[id].owned && SHOP_META[id].kind === 'shop' && pickupOpen(world, id) && itemsOnSale(world, id).length);
  if (!shops.length) return null;
  const shopId = pick(world, shops);
  const item = pick(world, itemsOnSale(world, shopId));
  const qty = pick(world, LIFE.PARTY_QTY);
  const dueSec = Math.round(hourToSec(pick(world, LIFE.PARTY_DUE_HOURS)));
  const price = world.shops[shopId].prices[item] ?? ITEMS[item].basePrice;
  return {
    kind: pick(world, PARTIES).id, shopId, item, qty, delivered: 0,
    offerUntil: Math.min(LIFE.PARTY_OFFER_SEC, dueSec - 30), dueSec,
    reward: Math.max(10_000, Math.round((qty * price * LIFE.PARTY_BONUS) / 10_000) * 10_000),
    state: 'offer',
  };
}

export function partyDef(kind: string) {
  return PARTIES.find((p) => p.id === kind) ?? PARTIES[0];
}

export function partyTitle(p: Party): string {
  const d = partyDef(p.kind);
  return `${d.icon} ${d.name}: ${p.qty} ${ITEMS[p.item].name.toLowerCase()}`;
}

export function acceptParty(world: WorldState, byPlayerId: string): ActionResult {
  const p = world.party;
  if (!p || p.state !== 'offer') return { ok: false, error: 'NOT_FOUND' };
  if (!isOnSale(world, p.shopId, p.item)) return { ok: false, error: 'BAD_ITEM' };
  p.state = 'active';
  addLog(world, `🎉 ${playerName(world, byPlayerId)} nhận đơn ${partyTitle(p)} — mang tới điểm giao ${SHOP_META[p.shopId].name}!`);
  return { ok: true };
}

export function declineParty(world: WorldState, byPlayerId: string): ActionResult {
  const p = world.party;
  if (!p || p.state !== 'offer') return { ok: false, error: 'NOT_FOUND' };
  p.state = 'declined';
  addLog(world, `${playerName(world, byPlayerId)} từ chối đơn ${partyTitle(p)}`);
  return { ok: true };
}

/** Món tiệc điểm giao của quán này còn cần (rỗng nếu không có đơn tiệc đang làm ở đây). */
export function partyNeeds(world: WorldState, shopId: ShopId): ItemId[] {
  const p = world.party;
  if (!p || p.state !== 'active' || p.shopId !== shopId) return [];
  return Array<ItemId>(Math.max(0, p.qty - p.delivered)).fill(p.item);
}

/** Đưa 1 món vào đơn tiệc; đủ món thì nhận thưởng. */
export function deliverParty(world: WorldState, shopId: ShopId, item: ItemId, x: number, z: number): SimEvent[] {
  const p = world.party;
  if (!p || p.state !== 'active' || p.shopId !== shopId || p.item !== item || p.delivered >= p.qty) return [];
  p.delivered += 1;
  if (p.delivered < p.qty) return [];
  p.state = 'done';
  p.endSec = world.secOfDay;
  world.money += p.reward;
  world.dayStats.revenue += p.reward;
  world.dayStats.sold[p.item] = (world.dayStats.sold[p.item] ?? 0) + p.qty;
  world.lifetime.parties = (world.lifetime.parties ?? 0) + 1;
  for (let i = 0; i < 3; i++) pushRating(world.shops[shopId], 5);
  addLog(world, `🎉 Giao xong đơn ${partyTitle(p)} — nhận ${formatK(p.reward)}!`);
  return [{ type: 'partyDone', shopId, reward: p.reward, x, z }, ...addEarned(world, shopId, p.reward)];
}

/** Hết hạn nhận đơn → huỷ; quá giờ hẹn mà chưa đủ → chỉ được trả giá thường cho phần đã giao, quán mang tiếng. */
export function tickParty(world: WorldState): SimEvent[] {
  const p = world.party;
  if (!p) return [];
  if (p.state === 'offer' && world.secOfDay > p.offerUntil) {
    p.state = 'declined';
    addLog(world, `Đơn ${partyTitle(p)} đã đặt chỗ khác vì không ai nhận`);
    return [];
  }
  if (p.state !== 'active' || world.secOfDay < p.dueSec) return [];
  p.state = 'failed';
  p.endSec = world.secOfDay;
  const shop = world.shops[p.shopId];
  const pay = p.delivered * (shop.prices[p.item] ?? ITEMS[p.item].basePrice);
  world.money += pay;
  world.dayStats.revenue += pay;
  if (p.delivered) world.dayStats.sold[p.item] = (world.dayStats.sold[p.item] ?? 0) + p.delivered;
  pushRating(shop, BALANCE.SCORE_ABANDON);
  addLog(world, p.delivered ? `😢 Trễ hẹn đơn ${partyTitle(p)} (${p.delivered}/${p.qty}) — chỉ nhận ${formatK(pay)}` : `😢 Trễ hẹn đơn ${partyTitle(p)} — khách huỷ đơn`);
  return [{ type: 'partyFailed', shopId: p.shopId, delivered: p.delivered, qty: p.qty }, ...(pay ? addEarned(world, p.shopId, pay) : [])];
}

/** Đầu ngày (gọi trong startDay): khách quen hẹn giờ ghé, có thể có đơn đặt tiệc. */
export function startLifeDay(world: WorldState): SimEvent[] {
  world.regulars ??= [];
  prepareRegulars(world);
  world.party = makeParty(world);
  if (!world.party) return [];
  addLog(world, `📞 Có khách gọi đặt ${partyTitle(world.party)} cho ${SHOP_META[world.party.shopId].name} — vào bảng bên trái để nhận!`);
  return [{ type: 'partyOffer', shopId: world.party.shopId }];
}
