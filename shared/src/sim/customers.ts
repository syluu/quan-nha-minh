import { BALANCE, FUN, ITEMS, LIFE, SHOP_META, SHOPS, festivalOfDay, getStationDef } from '../content';
import { bumpCombo, credit, tourDoor, walkInMultiplier } from './fun';
import type { ItemId, PlacedStation, ShopId, ShopLayout } from '../content';
import { distanceToFootprint } from './carry';
import type { SimEvent } from './events';
import { effectiveStars, marketingMultiplier } from './marketing';
import { pushRating } from './rating';
import { gameHour } from './time';
import type { Customer, Regular, ShopState, WorldState } from './world';
import { nextRandom } from './world';
import { addEarned, changeLove, dueRegulars, loveLevel, maybeGift, staffSpeedMult, tierTrafficMultiplier } from './life';

const ARRIVE = 0.05;
/** Nhịp xuống xe của đoàn khách (không cần lưu). */
const tourTimers = new WeakMap<ShopState, number>();

export function trafficMultiplier(s: number): number {
  const pts = BALANCE.STAR_MULT;
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (s <= x1) return y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

export function hourMultiplier(layout: ShopLayout, hour: number): number {
  const seg = layout.hourCurve.find(([from, to]) => hour >= from && hour < to);
  return seg ? seg[2] : 0;
}

export function priceOf(shop: ShopState, item: ItemId): number {
  return shop.prices[item] ?? ITEMS[item].basePrice;
}

function cashierOf(shopId: ShopId): PlacedStation {
  return SHOPS[shopId].stations.find((s) => getStationDef(s.def).kind === 'cashier')!;
}

function displayFor(shopId: ShopId, item: ItemId): PlacedStation | undefined {
  return SHOPS[shopId].stations.find((s) => {
    const d = getStationDef(s.def);
    return d.kind === 'display' && d.item === item;
  });
}

export function isCashierManned(world: WorldState, shopId: ShopId): boolean {
  return cashierRate(world, shopId) > 0;
}

/** Tốc độ tính tiền: 0 = không ai đứng quầy; người chơi = 1; thu ngân thuê thì theo sức (mệt thì chậm). */
export function cashierRate(world: WorldState, shopId: ShopId): number {
  const cashier = cashierOf(shopId);
  const near = (x: number, z: number) => distanceToFootprint(cashier, x, z) <= BALANCE.CASHIER_DIST;
  if (Object.values(world.players).some((p) => p.online && p.location === shopId && near(p.x, p.z))) return 1;
  const s = world.shops[shopId].staff.find((x) => x.role === 'cashier' && near(x.x, x.z));
  return s ? Math.min(1, staffSpeedMult(s)) : 0;
}

function pickWeighted<T>(world: WorldState, list: T[], weight: (t: T) => number): T {
  const total = list.reduce((s, t) => s + weight(t), 0);
  let r = nextRandom(world) * total;
  for (const t of list) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return list[list.length - 1];
}

/**
 * Chọn món một người mua muốn (1–3 món đang bán, theo độ thích từng món), rồi bỏ món đắt hơn giá họ chấp nhận.
 * Dùng chung cho khách tại quán và đơn online.
 */
export function chooseWants(world: WorldState, shopId: ShopId, tourist = false): { candidates: ItemId[]; kept: ItemId[] } {
  const shop = world.shops[shopId];
  const candidates = (Object.keys(ITEMS) as ItemId[]).filter((it) => {
    if (!ITEMS[it].sellable) return false;
    const d = displayFor(shopId, it);
    return d !== undefined && shop.stations[d.instanceId].unlocked;
  });
  if (candidates.length === 0) return { candidates, kept: [] };
  const weights = BALANCE.ITEMS_PER_CUSTOMER_WEIGHTS;
  // Khách du lịch mua nhiều hơn (2–3 món) và chịu giá cao hơn.
  const n = Math.min(tourist ? 2 + Math.floor(nextRandom(world) * 2) : pickWeighted(world, [1, 2, 3], (k) => weights[k - 1]), candidates.length);
  const pool = [...candidates];
  const kept: ItemId[] = [];
  for (let i = 0; i < n; i++) {
    const item = pickWeighted(world, pool, (it) => ITEMS[it].demandWeight);
    pool.splice(pool.indexOf(item), 1);
    const wtp = tourist
      ? ITEMS[item].basePrice * FUN.TOURIST_WTP
      : ITEMS[item].basePrice * (BALANCE.WTP_MIN + nextRandom(world) * (BALANCE.WTP_MAX - BALANCE.WTP_MIN));
    if (priceOf(shop, item) <= wtp) kept.push(item);
  }
  return { candidates, kept };
}

/** Sinh một khách ở lối vào và quyết định họ muốn mua gì theo giá. */
export function spawnCustomer(world: WorldState, shopId: ShopId, tourist = false, regular?: Regular): Customer | null {
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];
  const chosen = chooseWants(world, shopId, tourist);
  const { candidates } = chosen;
  let kept = chosen.kept;
  if (candidates.length === 0) return null;
  if (regular) {
    // Khách quen: luôn gọi món ruột (nếu giá không quá cao); quen rồi thì thỉnh thoảng gọi thêm một món.
    const okPrice = priceOf(shop, regular.fav) <= ITEMS[regular.fav].basePrice * BALANCE.WTP_MAX;
    const extra = loveLevel(regular.love) >= 1 && nextRandom(world) < 0.5 ? kept.filter((it) => it !== regular.fav).slice(0, 1) : [];
    kept = okPrice && candidates.includes(regular.fav) ? [regular.fav, ...extra] : [];
  }

  // Khách đoàn du lịch bước xuống từ cửa xe đỗ ngoài đường.
  const start = tourist ? tourDoor(shopId) : layout.entrance;
  const c: Customer = {
    id: shop.nextCustomerId++,
    x: start.x,
    z: start.z,
    dir: 0,
    state: kept.length ? 'toShelf' : 'leaving',
    wants: kept,
    bill: 0,
    waited: 0,
    payTimer: 0,
    holding: [],
    scored: false,
    table: null,
    seat: 0,
    eatTimer: 0,
    ...(tourist ? { tourist: true } : {}),
    ...(regular ? { regular: regular.id } : {}),
  };
  if (!kept.length) {
    pushRating(shop, BALANCE.SCORE_PRICEY);
    c.scored = true;
    c.face = '💸';
  }
  shop.customers.push(c);
  return c;
}

function walk(c: Customer, tx: number, tz: number, dt: number): boolean {
  const dx = tx - c.x;
  const dz = tz - c.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) {
    c.x = tx;
    c.z = tz;
    return true;
  }
  const step = Math.min(d, BALANCE.CUSTOMER_SPEED * dt);
  c.x += (dx / d) * step;
  c.z += (dz / d) * step;
  c.dir = Math.atan2(dx, dz);
  return step >= d - ARRIVE;
}

function seatPoint(shopId: ShopId, c: Customer): { x: number; z: number } | null {
  if (!c.table) return null;
  return SHOPS[shopId].stations.find((p) => p.instanceId === c.table)?.seatPoints?.[c.seat] ?? null;
}

/**
 * Khách vừa trả tiền ở quán có bàn: 60% muốn ăn tại chỗ. Còn chỗ sạch → giữ chỗ, đi tới ngồi.
 * Hết chỗ → mang về (chấm tối đa 4 sao). Chưa mở bàn nào → mang về bình thường.
 */
export function seatCustomer(world: WorldState, shopId: ShopId, c: Customer): 'seated' | 'takeaway' | 'none' {
  if (!SHOP_META[shopId].hasTables) return 'none';
  const shop = world.shops[shopId];
  const tables = SHOPS[shopId].stations.filter((p) => p.seatPoints && shop.stations[p.instanceId].unlocked);
  if (!tables.length) return 'none';
  if (nextRandom(world) >= BALANCE.DINE_IN_CHANCE) return 'none';
  for (const t of tables) {
    const st = shop.stations[t.instanceId];
    const i = st.seats.indexOf('free');
    if (i < 0) continue;
    st.seats[i] = 'taken';
    c.table = t.instanceId;
    c.seat = i;
    c.eatTimer = 0;
    return 'seated';
  }
  return 'takeaway';
}

function scoreFor(waited: number): number {
  if (waited <= BALANCE.SCORE_FAST_SEC) return 5;
  if (waited <= BALANCE.SCORE_OK_SEC) return 4;
  return 3;
}

export function tickCustomers(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const shop = world.shops[shopId];
  const layout = SHOPS[shopId];

  // Sinh khách
  shop.nextCustomerIn -= dt;
  if (shop.nextCustomerIn <= 0) {
    const hour = gameHour(world.secOfDay);
    const hm = hour < BALANCE.LAST_SPAWN_HOUR ? hourMultiplier(layout, hour) : 0;
    if (hm <= 0) {
      shop.nextCustomerIn = 1;
    } else if (shop.customers.length >= BALANCE.MAX_CUSTOMERS) {
      shop.nextCustomerIn = 0.5;
    } else {
      spawnCustomer(world, shopId);
      const mean =
        layout.baseCustomerIntervalSec / (hm * trafficMultiplier(effectiveStars(shop)) * marketingMultiplier(shop) * walkInMultiplier(world) * tierTrafficMultiplier(shop));
      shop.nextCustomerIn = -Math.log(1 - nextRandom(world)) * mean;
    }
  }

  // Khách quen tới giờ ghé (mỗi người một lần mỗi ngày); quen rồi thì hay dẫn bạn theo.
  if (gameHour(world.secOfDay) < BALANCE.LAST_SPAWN_HOUR && shop.customers.length < BALANCE.MAX_CUSTOMERS)
    for (const r of dueRegulars(world, shopId)) {
      r.visitedDay = world.day;
      r.visits += 1;
      const c = spawnCustomer(world, shopId, false, r);
      if (!c) continue;
      if (!c.wants.length) events.push(...changeLove(world, r, LIFE.LOVE_PRICEY, c.x, c.z));
      else if (loveLevel(r.love) >= 1 && nextRandom(world) < LIFE.FRIEND_CHANCE) spawnCustomer(world, shopId);
    }

  // Đoàn khách du lịch xuống xe lần lượt.
  if (shop.tourLeft && shop.customers.length < BALANCE.MAX_CUSTOMERS) {
    // Khách đầu tiên chờ xe dừng hẳn rồi mới xuống.
    const left = (tourTimers.get(shop) ?? FUN.TOUR_FIRST_STEP_SEC) - dt;
    if (left <= 0) {
      spawnCustomer(world, shopId, true);
      shop.tourLeft -= 1;
      if (shop.tourLeft) tourTimers.set(shop, FUN.TOUR_GAP_SEC);
      else tourTimers.delete(shop);
    } else tourTimers.set(shop, left);
  }

  const cashier = cashierOf(shopId);
  const rate = cashierRate(world, shopId);
  const manned = rate > 0;
  let queueIndex = 0;

  for (const c of [...shop.customers]) {
    switch (c.state) {
      case 'toShelf': {
        const d = displayFor(shopId, c.wants[0])!;
        if (walk(c, d.customerPoint!.x, d.customerPoint!.z, dt)) c.state = 'atShelf';
        break;
      }
      case 'atShelf': {
        const d = displayFor(shopId, c.wants[0])!;
        const st = shop.stations[d.instanceId];
        if (st.stock > 0) {
          st.stock -= 1;
          const item = c.wants.shift()!;
          c.holding.push(item);
          c.bill += priceOf(shop, item);
          if (c.wants.length) c.state = 'toShelf';
          else {
            c.state = 'toQueue';
            // Xếp cuối hàng: dời xuống cuối mảng để thứ tự mảng = thứ tự hàng.
            shop.customers.splice(shop.customers.indexOf(c), 1);
            shop.customers.push(c);
          }
        } else c.waited += dt;
        break;
      }
      case 'toQueue':
      case 'inQueue':
      case 'paying': {
        const i = queueIndex++;
        const tx = cashier.customerPoint!.x + layout.queueDir.x * BALANCE.QUEUE_SPACING * i;
        const tz = cashier.customerPoint!.z + layout.queueDir.z * BALANCE.QUEUE_SPACING * i;
        const arrived = walk(c, tx, tz, dt);
        if (!arrived) {
          c.state = 'toQueue';
          break;
        }
        if (c.state === 'toQueue') c.state = 'inQueue';
        if (i === 0 && manned) {
          c.state = 'paying';
          c.payTimer += dt * rate;
          if (c.payTimer >= BALANCE.CASHIER_SERVICE_SEC - 1e-6) {
            world.money += c.bill;
            world.dayStats.revenue += c.bill;
            world.dayStats.served += 1;
            for (const it of c.holding) world.dayStats.sold[it] = (world.dayStats.sold[it] ?? 0) + 1;
            const seat = seatCustomer(world, shopId, c);
            const score = scoreFor(c.waited);
            const rated = seat === 'takeaway' ? Math.min(score, BALANCE.TAKEAWAY_MAX_SCORE) : score;
            pushRating(shop, rated);
            c.scored = true;
            c.state = seat === 'seated' ? 'toTable' : 'leaving';
            // Phục vụ nhanh thì khách vui và boa (khách du lịch boa nhiều, ngày lễ gấp đôi).
            const fast = c.waited <= BALANCE.SCORE_FAST_SEC;
            const reg = c.regular ? world.regulars.find((r) => r.id === c.regular) : undefined;
            // Khách ruột boa gấp đôi.
            const tipMult = (festivalOfDay(world.day) ? FUN.FESTIVAL_TIP : 1) * (reg && loveLevel(reg.love) >= 2 ? 2 : 1);
            const tip = fast
              ? Math.round((c.bill * (c.tourist ? FUN.TOURIST_TIP_RATE : FUN.TIP_RATE) * tipMult) / 500) * 500
              : 0;
            if (tip > 0) {
              world.money += tip;
              world.dayStats.revenue += tip;
              world.dayStats.tips += tip;
            }
            c.face = rated >= 5 ? (tip ? '😍' : '😋') : rated >= 4 ? '🙂' : '😐';
            const cashierPlayer = Object.values(world.players).find(
              (p) => p.online && p.location === shopId && distanceToFootprint(cashier, p.x, p.z) <= BALANCE.CASHIER_DIST,
            );
            if (cashierPlayer) credit(world, cashierPlayer.id, 'served');
            events.push({ type: 'sale', shopId, amount: c.bill, x: c.x, z: c.z, ...(tip ? { tip } : {}) });
            events.push(...addEarned(world, shopId, c.bill + tip));
            if (reg) {
              events.push(...changeLove(world, reg, LIFE.LOVE_SERVED + (fast ? LIFE.LOVE_FAST : 0), c.x, c.z));
              events.push(...maybeGift(world, shop, reg, c.x, c.z));
            }
            events.push(...bumpCombo(world, shop, fast, c.waited > BALANCE.SCORE_OK_SEC, c.x, c.z));
          }
        } else c.waited += dt;
        break;
      }
      case 'toTable': {
        const pt = seatPoint(shopId, c);
        if (!pt) c.state = 'leaving';
        else if (walk(c, pt.x, pt.z, dt)) c.state = 'eating';
        break;
      }
      case 'eating': {
        c.eatTimer += dt;
        if (c.eatTimer >= BALANCE.EAT_SEC - 1e-6) {
          const st = c.table ? shop.stations[c.table] : null;
          if (st && st.seats[c.seat] === 'taken') st.seats[c.seat] = 'dirty';
          c.table = null;
          c.holding = [];
          c.state = 'leaving';
        }
        break;
      }
      case 'leaving': {
        // Khách đoàn đi bộ ra lại xe du lịch; khách thường ra cửa.
        const out = c.tourist ? tourDoor(shopId) : layout.exit;
        if (walk(c, out.x, out.z, dt)) shop.customers.splice(shop.customers.indexOf(c), 1);
        break;
      }
    }

    if (!c.scored && c.waited > BALANCE.PATIENCE_SEC) {
      pushRating(shop, BALANCE.SCORE_ABANDON);
      c.scored = true;
      c.state = 'leaving';
      c.holding = [];
      c.face = '😡';
      shop.combo = 0;
      const reg = c.regular ? world.regulars.find((r) => r.id === c.regular) : undefined;
      if (reg) changeLove(world, reg, LIFE.LOVE_LOST, c.x, c.z);
      world.dayStats.lost += 1;
      events.push({ type: 'customerLost', shopId, x: c.x, z: c.z });
    }
  }
  return events;
}
