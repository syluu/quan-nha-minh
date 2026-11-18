import { BADGES, BALANCE, EMOTES, FUN, ITEMS, SHOP_IDS, SHOP_META, SHOPS, festivalOfDay, getStationDef } from '../content';
import type { ItemId, ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import type { SimEvent } from './events';
import { addLog } from './log';
import { pushRating } from './rating';
import { gameHour } from './time';
import type { PlayerDayStats, Quest, ShopState, WorldState } from './world';
import { nextRandom } from './world';
import { startLifeDay } from './life';

// ───────────────────────── Thành tích từng người trong ngày ─────────────────────────

/** Cộng một việc vào bảng vinh danh hôm nay của người chơi. */
export function credit(world: WorldState, playerId: string, field: Exclude<keyof PlayerDayStats, 'name'>, n = 1): void {
  const p = world.players[playerId];
  if (!p) return;
  const row = (world.dayPlayers[playerId] ??= { name: p.name, placed: 0, served: 0, cleaned: 0, crates: 0 });
  row.name = p.name;
  row[field] += n;
}

// ───────────────────────── Biểu cảm, đập tay ─────────────────────────

export function emote(world: WorldState, playerId: string, kind: unknown): ActionResult {
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  if (typeof kind !== 'string' || !Object.hasOwn(EMOTES, kind)) return { ok: false, error: 'BAD_ITEM' };
  p.emote = kind;
  p.emoteLeft = FUN.EMOTE_SEC;
  return { ok: true };
}

/** Bấm đập tay: nếu người nhà đứng cạnh cũng vừa bấm → cả hai được tăng tốc. */
export function highFive(world: WorldState, playerId: string): ActionResult {
  const p = world.players[playerId];
  if (!p) return { ok: false, error: 'NOT_FOUND' };
  p.hiFive = FUN.HIFIVE_WINDOW;
  p.emote = 'hifive';
  p.emoteLeft = FUN.HIFIVE_WINDOW;
  return { ok: true };
}

/** Mỗi bước: giảm thời gian biểu cảm / tăng tốc, ghép cặp đập tay. */
export function tickPlayersFun(world: WorldState, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const online = Object.values(world.players).filter((p) => p.online);
  for (const p of online) {
    if (p.emoteLeft) {
      p.emoteLeft = Math.max(0, p.emoteLeft - dt);
      if (!p.emoteLeft) p.emote = null;
    }
    if (p.boost) p.boost = Math.max(0, p.boost - dt);
    if (p.hiFive) p.hiFive = Math.max(0, p.hiFive - dt);
  }
  for (let i = 0; i < online.length; i++)
    for (let j = i + 1; j < online.length; j++) {
      const a = online[i];
      const b = online[j];
      if (!a.hiFive || !b.hiFive || a.location !== b.location) continue;
      if (Math.hypot(a.x - b.x, a.z - b.z) > FUN.HIFIVE_DIST) continue;
      for (const p of [a, b]) {
        p.hiFive = 0;
        p.boost = FUN.HIFIVE_BOOST_SEC;
        p.emote = 'hifive_ok';
        p.emoteLeft = 1.5;
      }
      events.push({ type: 'highFive', shopId: a.location, names: [a.name, b.name], x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
    }
  return events;
}

// ───────────────────────── Đầu ngày: thời tiết, đoàn khách, mèo, nhiệm vụ ─────────────────────────

const isShop = (id: ShopId) => SHOP_META[id].kind === 'shop';
const ownedShops = (world: WorldState) => SHOP_IDS.filter((id) => world.shops[id].owned && isShop(id));

/** Chuẩn bị nội dung một ngày (gọi một lần mỗi ngày, cả khi tải lại file lưu giữa ngày thì không làm lại). */
export function startDay(world: WorldState): SimEvent[] {
  if (world.funDay === world.day) return [];
  world.funDay = world.day;
  const events: SimEvent[] = [];
  const festival = festivalOfDay(world.day);
  world.weather = !festival && nextRandom(world) < FUN.RAIN_CHANCE ? 'rain' : 'sun';
  const shops = ownedShops(world);
  world.tour = null;
  if (shops.length && nextRandom(world) < FUN.TOUR_CHANCE) {
    const shopId = shops[Math.floor(nextRandom(world) * shops.length)];
    world.tour = { shopId, at: Math.round(60 + nextRandom(world) * 220), done: false };
  }
  for (const id of shops) {
    const shop = world.shops[id];
    if (shop.cat === 'stray') shop.cat = 'none'; // mèo hoang hôm qua không được cho ăn thì đi mất
    if ((shop.cat ?? 'none') === 'none' && nextRandom(world) < FUN.CAT_CHANCE) {
      shop.cat = 'stray';
      events.push({ type: 'catStray', shopId: id });
    }
  }
  world.quests = makeQuests(world);
  events.push(...startLifeDay(world));
  if (festival) addLog(world, `${festival.icon} Hôm nay là ${festival.name}! Khách đông hơn, tiền boa gấp đôi`);
  if (world.weather === 'rain') addLog(world, '🌧️ Trời mưa: khách đi bộ ít hơn nhưng đơn online tăng');
  return events;
}

/** Hệ số khách đi bộ theo thời tiết + ngày lễ. */
export function walkInMultiplier(world: WorldState): number {
  return (world.weather === 'rain' ? FUN.RAIN_WALKIN : 1) * (festivalOfDay(world.day) ? FUN.FESTIVAL_TRAFFIC : 1);
}

/** Hệ số đơn online theo thời tiết + ngày lễ. */
export function onlineWeatherMultiplier(world: WorldState): number {
  return (world.weather === 'rain' ? FUN.RAIN_ONLINE : 1) * (festivalOfDay(world.day) ? FUN.FESTIVAL_TRAFFIC : 1);
}

/** Đoàn khách du lịch: tới giờ thì xe đỗ, khách xuống dần (tickCustomers sinh khách). */
/** Xe du lịch đỗ sát lề đường trước quán (làn gần), cửa xe quay vào vỉa hè. */
export function tourBusSpot(shopId: ShopId): { x: number; z: number } {
  const b = SHOPS[shopId].bounds;
  return { x: b.minX + 6, z: b.maxZ + 6.4 };
}

/** Chỗ khách bước xuống / lên xe (mép vỉa hè cạnh cửa xe). */
export function tourDoor(shopId: ShopId): { x: number; z: number } {
  const s = tourBusSpot(shopId);
  return { x: s.x + 1.2, z: s.z - 1.2 };
}

export function tickTour(world: WorldState, shopId: ShopId): SimEvent[] {
  const shop = world.shops[shopId];
  // Xe còn đỗ chừng nào còn khách đoàn chưa xuống hoặc chưa lên lại xe.
  if ((shop.tourBusUntil ?? -1) > world.secOfDay && (shop.tourLeft || shop.customers.some((c) => c.tourist)))
    shop.tourBusUntil = Math.max(shop.tourBusUntil ?? 0, world.secOfDay + 1.5);
  const t = world.tour;
  if (!t || t.done || t.shopId !== shopId || world.secOfDay < t.at) return [];
  if (gameHour(world.secOfDay) >= BALANCE.LAST_SPAWN_HOUR) return [];
  t.done = true;
  shop.tourLeft = FUN.TOUR_SIZE;
  shop.tourBusUntil = world.secOfDay + FUN.TOUR_BUS_SEC;
  world.lifetime.tours += 1;
  addLog(world, `🚌 Một đoàn khách du lịch vừa tới ${SHOP_META[shopId].name}!`);
  return [{ type: 'tourBus', shopId }];
}

/** Chỗ mèo hoang ngồi chờ (vỉa hè trước-trái quán). */
export function catSpot(shopId: ShopId): { x: number; z: number } {
  const b = SHOPS[shopId].bounds;
  return { x: b.minX + 3, z: b.maxZ - 0.8 };
}

/** Người chơi đứng yên cạnh mèo hoang, đang cầm đồ ăn → cho mèo ăn món trên cùng, mèo ở lại làm mèo của quán. */
export function tickCat(world: WorldState, shopId: ShopId): SimEvent[] {
  const shop = world.shops[shopId];
  if (shop.cat !== 'stray') return [];
  const spot = catSpot(shopId);
  for (const p of Object.values(world.players)) {
    if (!p.online || p.location !== shopId || !p.carry.length) continue;
    if (Math.hypot(p.x - spot.x, p.z - spot.z) > FUN.CAT_FEED_DIST) continue;
    if (Math.hypot(p.input.mx, p.input.mz) > BALANCE.STILL_INPUT) continue;
    let food = -1;
    for (let i = p.carry.length - 1; i >= 0; i--) if (!ITEMS[p.carry[i]].bundle) {
      food = i;
      break;
    }
    if (food < 0) continue;
    p.carry.splice(food, 1);
    shop.cat = 'pet';
    for (let i = 0; i < 3; i++) pushRating(shop, 5);
    addLog(world, `🐱 ${p.name} cho mèo hoang ăn — mèo ở lại làm mèo của quán!`);
    return [{ type: 'catFed', shopId, x: spot.x, z: spot.z }];
  }
  return [];
}

// ───────────────────────── Nhiệm vụ hằng ngày ─────────────────────────

function itemsOnSale(world: WorldState): ItemId[] {
  const out: ItemId[] = [];
  for (const id of ownedShops(world))
    for (const p of SHOPS[id].stations) {
      const d = getStationDef(p.def);
      if (d.kind === 'display' && world.shops[id].stations[p.instanceId].unlocked) out.push(d.item);
    }
  return [...new Set(out)];
}

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

/** Chọn 3 nhiệm vụ hợp với tình hình quán (có bán online / có bàn thì mới ra nhiệm vụ đó). */
export function makeQuests(world: WorldState): Quest[] {
  const recent = world.history.slice(-3);
  const avgRevenue = recent.length ? recent.reduce((n, h) => n + h.revenue, 0) / recent.length : 300_000;
  const avgServed = recent.length ? recent.reduce((n, h) => n + h.served, 0) / recent.length : 30;
  const items = itemsOnSale(world);
  const hasOnline = ownedShops(world).some((id) => SHOPS[id].stations.some((p) => getStationDef(p.def).kind === 'pickup' && world.shops[id].stations[p.instanceId].unlocked));
  const hasTables = ownedShops(world).some((id) => SHOPS[id].stations.some((p) => p.seatPoints && world.shops[id].stations[p.instanceId].unlocked));
  const pool: Quest[] = [];
  const day = world.day;
  if (items.length) {
    const item = items[Math.floor(nextRandom(world) * items.length)];
    const target = round(Math.max(10, avgServed * 0.5), 5);
    pool.push({ id: `${day}-sell`, kind: 'sell', item, target, reward: round(target * ITEMS[item].basePrice * 0.6, 50_000), done: false });
  }
  pool.push({ id: `${day}-serve`, kind: 'serve', target: round(Math.max(20, avgServed * 1.1), 5), reward: 300_000, done: false });
  pool.push({ id: `${day}-revenue`, kind: 'revenue', target: round(Math.max(300_000, avgRevenue * 1.15), 100_000), reward: round(Math.max(200_000, avgRevenue * 0.12), 50_000), done: false });
  pool.push({ id: `${day}-tips`, kind: 'tips', target: round(Math.max(20_000, avgRevenue * 0.03), 10_000), reward: 200_000, done: false });
  pool.push({ id: `${day}-no_lost`, kind: 'no_lost', target: 14, reward: 400_000, done: false });
  if (hasOnline) pool.push({ id: `${day}-online`, kind: 'online', target: 5, reward: 300_000, done: false });
  if (hasTables) pool.push({ id: `${day}-clean`, kind: 'clean', target: 20, reward: 250_000, done: false });
  const out: Quest[] = [];
  while (out.length < FUN.QUESTS_PER_DAY && pool.length) out.push(pool.splice(Math.floor(nextRandom(world) * pool.length), 1)[0]);
  return out;
}

/** Tiến độ hiện tại của một nhiệm vụ (để hiện thanh tiến độ). */
export function questProgress(world: WorldState, q: Quest): number {
  const s = world.dayStats;
  switch (q.kind) {
    case 'sell':
      return s.sold[q.item!] ?? 0;
    case 'serve':
      return s.served;
    case 'revenue':
      return s.revenue;
    case 'tips':
      return s.tips;
    case 'online':
      return s.onlineOrders;
    case 'clean':
      return s.cleaned;
    case 'no_lost':
      return Math.min(q.target, Math.floor(gameHour(world.secOfDay)));
  }
}

/** Nhiệm vụ: mô tả cho người chơi. */
export function questText(q: Quest): string {
  switch (q.kind) {
    case 'sell':
      return `Bán ${q.target} ${ITEMS[q.item!].name.toLowerCase()}`;
    case 'serve':
      return `Phục vụ ${q.target} khách`;
    case 'revenue':
      return `Doanh thu đạt ${formatK(q.target)}`;
    case 'tips':
      return `Nhận ${formatK(q.target)} tiền boa`;
    case 'online':
      return `Giao xong ${q.target} đơn online`;
    case 'clean':
      return `Dọn ${q.target} chỗ ngồi`;
    case 'no_lost':
      return `Không để khách nào bỏ về trước ${q.target}:00 (từ 10 khách)`;
  }
}

export function checkQuests(world: WorldState): SimEvent[] {
  const events: SimEvent[] = [];
  for (const q of world.quests) {
    if (q.done || q.failed) continue;
    if (q.kind === 'no_lost') {
      if (world.dayStats.lost > 0) {
        q.failed = true;
        continue;
      }
      // Phải có khách thật (≥ 10 khách) mới tính là giữ được khách.
      if (gameHour(world.secOfDay) < q.target || world.dayStats.served < 10) continue;
    } else if (questProgress(world, q) < q.target) continue;
    q.done = true;
    world.money += q.reward;
    world.lifetime.quests += 1;
    addLog(world, `📋 Xong nhiệm vụ "${questText(q)}" — thưởng ${formatK(q.reward)}`);
    events.push({ type: 'questDone', text: questText(q), reward: q.reward });
  }
  return events;
}

// ───────────────────────── Huy hiệu ─────────────────────────

const BREAD: ItemId[] = ['banh_mi', 'banh_mi_trung', 'banh_mi_thit'];

function earned(world: WorldState, id: string): boolean {
  const L = world.lifetime;
  const bread = BREAD.reduce((n, it) => n + (L.sold[it] ?? 0), 0);
  switch (id) {
    case 'banh_mi_100':
      return bread >= 100;
    case 'banh_mi_1000':
      return bread >= 1000;
    case 'khach_500':
      return L.served >= 500;
    case 'khach_5000':
      return L.served >= 5000;
    case 'nam_sao':
      return L.fiveStarDays >= 1;
    case 'khong_ai_ve':
      return L.perfectDays >= 1;
    case 'combo_20':
      return L.bestCombo >= 20;
    case 'tip_1m':
      return L.tips >= 1_000_000;
    case 'online_100':
      return L.online >= 100;
    case 'ba_quan':
      return ownedShops(world).length >= 3;
    case 'chu_trang_trai':
      return (world.shops.farm.farmLevel ?? 0) >= BALANCE.FARM_EXPANSION_COSTS.length;
    case 'trieu_phu':
      return world.money >= 50_000_000;
    case 'meo_cung':
      return SHOP_IDS.some((s) => world.shops[s].cat === 'pet');
    case 'doan_khach':
      return L.tours >= 1;
    case 'kol':
      return SHOP_IDS.some((s) => world.shops[s].campaigns.some((c) => c.id === 'kol'));
    case 'nhiem_vu_10':
      return L.quests >= 10;
    case 'bat_trom':
      return (L.caught ?? 0) >= 3;
  }
  return false;
}

/** Xét huy hiệu mới (rẻ, gọi thường xuyên). */
export function checkBadges(world: WorldState): SimEvent[] {
  const events: SimEvent[] = [];
  for (const b of BADGES) {
    if (world.badges.includes(b.id) || !earned(world, b.id)) continue;
    world.badges.push(b.id);
    addLog(world, `🏅 Đạt huy hiệu ${b.icon} ${b.name}!`);
    events.push({ type: 'badge', id: b.id });
  }
  return events;
}

/** Cuối ngày: cộng số liệu dài hạn để xét huy hiệu. */
export function endDayLifetime(world: WorldState, stars: number): void {
  const s = world.dayStats;
  const L = world.lifetime;
  L.served += s.served;
  L.tips += s.tips;
  L.online += s.onlineOrders;
  L.bestCombo = Math.max(L.bestCombo, s.bestCombo);
  for (const [it, n] of Object.entries(s.sold)) L.sold[it as ItemId] = (L.sold[it as ItemId] ?? 0) + (n ?? 0);
  if (stars >= 4.8 && s.served >= 20) L.fiveStarDays += 1;
  if (s.lost === 0 && s.served >= 40) L.perfectDays += 1;
}

/** Combo phục vụ nhanh: mỗi mốc 5 khách thưởng thêm. */
export function bumpCombo(world: WorldState, shop: ShopState, fast: boolean, slow: boolean, x: number, z: number): SimEvent[] {
  if (slow) shop.combo = 0;
  if (!fast) return [];
  shop.combo = (shop.combo ?? 0) + 1;
  world.dayStats.bestCombo = Math.max(world.dayStats.bestCombo, shop.combo);
  if (shop.combo % FUN.COMBO_STEP !== 0) return [];
  const bonus = Math.min(FUN.COMBO_BONUS_MAX, shop.combo * FUN.COMBO_BONUS_PER);
  world.money += bonus;
  world.dayStats.revenue += bonus;
  return [{ type: 'combo', shopId: shop.id, n: shop.combo, bonus, x, z }];
}
