import { BALANCE, ITEMS, SHELF_ROW_Z, SHOPS, getStationDef, isFarm, itemCost } from '../content';
import type { ItemId, PlacedStation, ShopId } from '../content';
import { formatK } from '../money';
import type { ActionResult } from './actions';
import { trySettleAfterAction } from './settlement';
import { deliverToPickup, pickupNeeds, pickupOf } from './online';
import { loadCrate } from './carry';
import { plotDef } from './farm';
import type { SimEvent } from './events';
import { addLog, playerName } from './log';
import { isOnSale } from './prices';
import type { StaffRole, StaffState, WorldState } from './world';

/** Chỉ số theo cấp của một nhân viên. */
export function staffStats(s: Pick<StaffState, 'level'>) {
  return BALANCE.STAFF_LEVELS[Math.min(Math.max(s.level, 1), BALANCE.STAFF_LEVELS.length) - 1];
}

export function staffWage(s: Pick<StaffState, 'level'>): number {
  return staffStats(s).wage;
}

const ROLE_LABEL = (s: Pick<StaffState, 'role' | 'item'>) =>
  s.role === 'cashier' ? 'thu ngân' : s.role === 'courier' ? 'giao đơn' : s.role === 'cleaner' ? 'dọn bàn' : s.role === 'farmhand' ? 'làm trang trại' : s.item ? `phụ bếp ${ITEMS[s.item].name}` : 'phụ bếp';

/** Quán có bàn ăn đã mở → có chỗ cho 1 nhân viên dọn bàn. */
function tablesOpen(world: WorldState, shopId: ShopId): boolean {
  return SHOPS[shopId].stations.some((p) => p.seatPoints && world.shops[shopId].stations[p.instanceId].unlocked);
}

/** Các món có kệ đang mở (mỗi món = 1 chỗ phụ bếp). */
function openLines(world: WorldState, shopId: ShopId): ItemId[] {
  const items: ItemId[] = [];
  for (const p of SHOPS[shopId].stations) {
    const def = getStationDef(p.def);
    if (def.kind === 'display' && world.shops[shopId].stations[p.instanceId].unlocked) items.push(def.item);
  }
  return items;
}

/** Số phụ bếp tối đa của quán: bằng số kệ đang mở (ít nhất 1). */
export function maxCooks(world: WorldState, shopId: ShopId): number {
  return Math.max(1, openLines(world, shopId).length);
}

export function staffSlots(world: WorldState, shopId: ShopId): {
  cashier: { max: 1; used: number };
  /** Chỉ có khi điểm giao hàng đã mở. */
  courier: { max: 1; used: number } | null;
  /** Chỉ có khi quán đã mở bàn ăn. */
  cleaner: { max: 1; used: number } | null;
  /** Chỉ ở trang trại. */
  farmhand: { max: number; used: number } | null;
  /** Phụ bếp đa năng: tối đa bằng số kệ đang mở (ít nhất 1). */
  cooks: { max: number; used: number };
} {
  const staff = world.shops[shopId].staff;
  return {
    cashier: { max: 1, used: staff.filter((s) => s.role === 'cashier').length },
    courier: pickupOpen(world, shopId) ? { max: 1, used: staff.filter((s) => s.role === 'courier').length } : null,
    cleaner: tablesOpen(world, shopId) ? { max: 1, used: staff.filter((s) => s.role === 'cleaner').length } : null,
    farmhand: isFarm(shopId) ? { max: BALANCE.FARMHANDS_MAX, used: staff.filter((s) => s.role === 'farmhand').length } : null,
    cooks: { max: maxCooks(world, shopId), used: staff.filter((s) => s.role === 'cook').length },
  };
}

export function hireStaff(world: WorldState, shopId: ShopId, role: StaffRole, item: ItemId | null, byPlayerId: string): ActionResult {
  const shop = world.shops[shopId];
  // Trang trại chỉ thuê người làm trang trại; quán không thuê người làm trang trại.
  if (isFarm(shopId) !== (role === 'farmhand')) return { ok: false, error: 'BAD_ROLE' };
  if (role === 'farmhand') {
    if (shop.staff.filter((s) => s.role === 'farmhand').length >= BALANCE.FARMHANDS_MAX) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else if (role === 'cashier') {
    if (shop.staff.some((s) => s.role === 'cashier')) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else if (role === 'courier') {
    if (!pickupOpen(world, shopId)) return { ok: false, error: 'BAD_ITEM' };
    if (shop.staff.some((s) => s.role === 'courier')) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else if (role === 'cleaner') {
    if (!tablesOpen(world, shopId)) return { ok: false, error: 'BAD_ITEM' };
    if (shop.staff.some((s) => s.role === 'cleaner')) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else if (role === 'cook') {
    // Phụ bếp đa năng: không gắn món; tối đa bằng số kệ đang mở.
    if (shop.staff.filter((s) => s.role === 'cook').length >= maxCooks(world, shopId)) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else {
    return { ok: false, error: 'BAD_ROLE' };
  }
  const used = new Set(shop.staff.map((s) => s.name));
  const name = BALANCE.STAFF_NAMES.find((n) => !used.has(n)) ?? `NV ${shop.nextStaffId}`;
  const s: StaffState = {
    id: `s${shop.nextStaffId++}`,
    name,
    role,
    item,
    x: BALANCE.STAFF_DOOR.x,
    z: BALANCE.STAFF_DOOR.z,
    dir: 0,
    carry: [],
    task: null,
    timer: 0,
    hiredDay: world.day,
    level: 1,
    wageOwed: 0,
  };
  shop.staff.push(s);
  addLog(world, `${playerName(world, byPlayerId)} đã thuê ${name} (${ROLE_LABEL(s)})`);
  return { ok: true };
}

export function fireStaff(world: WorldState, shopId: ShopId, staffId: string, byPlayerId: string): ActionResult {
  const shop = world.shops[shopId];
  const s = shop.staff.find((x) => x.id === staffId);
  if (!s) return { ok: false, error: 'NOT_FOUND' };
  // Trả lương còn nợ + ngày hôm nay (đã làm trong ngày, chưa được cộng vào nợ).
  const pay = s.wageOwed + staffWage(s);
  if (world.money < pay) return { ok: false, error: 'NO_MONEY' };
  world.money -= pay;
  shop.staff = shop.staff.filter((x) => x !== s);
  // Món đang cầm: trả về chỗ còn nhận được, còn thừa thì tính là hàng bỏ đi.
  for (const item of s.carry) {
    // Thùng hàng trang trại: bốc luôn lên xe vào kho.
    if (ITEMS[item].bundle) {
      loadCrate(world, item);
      continue;
    }
    const to = targetForCarry(world, shopId, item);
    if (to) {
      const st = shop.stations[to];
      const def = getStationDef(placedOf(shopId, to).def);
      if (def.kind === 'display') st.stock += 1;
      else st.inputs[item] = (st.inputs[item] ?? 0) + 1;
    } else world.dayStats.wasted += itemCost(item);
  }
  s.carry = [];
  addLog(world, `${playerName(world, byPlayerId)} đã cho ${s.name} nghỉ, trả ${formatK(pay)} lương`);
  trySettleAfterAction(world);
  return { ok: true };
}

/** Cuối ngày: mỗi nhân viên được ghi thêm lương ngày vào "lương còn nợ" (trả cuối tháng). */
export function accrueWages(world: WorldState): number {
  let total = 0;
  for (const id of Object.keys(world.shops) as ShopId[]) {
    for (const s of world.shops[id].staff) {
      const w = staffWage(s);
      s.wageOwed += w;
      total += w;
    }
  }
  world.dayStats.wages += total;
  return total;
}

// ───────────────────────── Nhân viên tự làm việc ─────────────────────────

const ARRIVE = 0.05;

function placedOf(shopId: ShopId, instanceId: string) {
  return SHOPS[shopId].stations.find((p) => p.instanceId === instanceId)!;
}

/** Trạm (đã mở) làm ra món `item`. */
function producerOf(world: WorldState, shopId: ShopId, item: ItemId) {
  return SHOPS[shopId].stations.find((p) => {
    const d = getStationDef(p.def);
    return (d.kind === 'producer' || d.kind === 'assembler') && d.output === item && world.shops[shopId].stations[p.instanceId].unlocked;
  });
}

function shelfOf(world: WorldState, shopId: ShopId, item: ItemId) {
  return SHOPS[shopId].stations.find((p) => {
    const d = getStationDef(p.def);
    return d.kind === 'display' && d.item === item && world.shops[shopId].stations[p.instanceId].unlocked;
  });
}

/** Còn nhận thêm bao nhiêu món `item` ở trạm đích. */
function roomAt(world: WorldState, shopId: ShopId, instanceId: string, item: ItemId): number {
  const def = getStationDef(placedOf(shopId, instanceId).def);
  const st = world.shops[shopId].stations[instanceId];
  if (!st.unlocked) return 0;
  if (def.kind === 'display') return def.item === item ? def.cap - st.stock : 0;
  if (def.kind === 'assembler' && !st.enabled) return 0;
  if (def.kind === 'assembler' && def.inputs.some((i) => i.item === item)) return def.inputCap - (st.inputs[item] ?? 0);
  return 0;
}

function walk(s: StaffState, tx: number, tz: number, dt: number): boolean {
  const dx = tx - s.x;
  const dz = tz - s.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) {
    s.x = tx;
    s.z = tz;
    return true;
  }
  const step = Math.min(d, staffStats(s).speed * dt);
  s.x += (dx / d) * step;
  s.z += (dz / d) * step;
  s.dir = Math.atan2(dx, dz);
  return d - step <= ARRIVE;
}

/**
 * Phụ bếp đa năng: chọn việc gấp nhất trong bếp.
 * - Bày kệ: kệ càng vơi càng gấp (kệ trống gấp nhất), lấy món ở máy đang có sẵn.
 * - Tiếp liệu bàn ghép: nguyên liệu càng thiếu càng gấp (kém gấp hơn kệ trống).
 * Việc người khác đang làm (cùng đích, cùng món) thì bỏ qua; gần mình hơn thì ưu tiên hơn một chút.
 */
function chooseGeneralJob(world: WorldState, shopId: ShopId, s: StaffState): StaffState['task'] {
  const shop = world.shops[shopId];
  const claimed = (to: string, item: ItemId) => shop.staff.some((o) => o !== s && o.task?.to === to && o.task.item === item);
  const ready = (item: ItemId) => {
    const src = producerOf(world, shopId, item);
    return src && shop.stations[src.instanceId].outputCount > 0 ? src : null;
  };
  let best: { score: number; task: NonNullable<StaffState['task']> } | null = null;
  const consider = (score: number, from: PlacedStation, to: PlacedStation, item: ItemId) => {
    if (claimed(to.instanceId, item)) return;
    const s2 = score - Math.hypot(from.workPoint.x - s.x, from.workPoint.z - s.z) * 0.15;
    if (!best || s2 > best.score) best = { score: s2, task: { from: from.instanceId, to: to.instanceId, item, phase: 'toSource' } };
  };
  for (const p of SHOPS[shopId].stations) {
    const def = getStationDef(p.def);
    const st = shop.stations[p.instanceId];
    if (!st.unlocked) continue;
    if (def.kind === 'display') {
      if (st.stock >= def.cap) continue;
      const src = ready(def.item);
      if (src) consider(10 * (1 - st.stock / def.cap) + (st.stock === 0 ? 5 : 0), src, p, def.item);
    } else if (def.kind === 'assembler' && st.enabled) {
      // Kệ của món ghép đã đầy và máy còn món chưa lấy thì chưa cần tiếp liệu.
      const shelf = shelfOf(world, shopId, def.output);
      if (shelf && roomAt(world, shopId, shelf.instanceId, def.output) <= 0 && st.outputCount > 0) continue;
      for (const inp of def.inputs) {
        const have = st.inputs[inp.item] ?? 0;
        if (have >= def.inputCap) continue;
        const src = ready(inp.item);
        if (src) consider(6 * (1 - have / def.inputCap) + (have === 0 ? 3 : 0), src, p, inp.item);
      }
    }
  }
  return (best as { task: NonNullable<StaffState['task']> } | null)?.task ?? null;
}

/** Chọn việc tiếp theo cho phụ bếp gắn một món (file lưu cũ chưa chuyển). */
function chooseJob(world: WorldState, shopId: ShopId, s: StaffState): StaffState['task'] {
  if (!s.item) return chooseGeneralJob(world, shopId, s);
  const item = s.item;
  const shop = world.shops[shopId];
  const shelf = shelfOf(world, shopId, item);
  const maker = producerOf(world, shopId, item);
  if (!shelf || !maker) return null;
  if (shop.stations[maker.instanceId].outputCount > 0 && roomAt(world, shopId, shelf.instanceId, item) > 0)
    return { from: maker.instanceId, to: shelf.instanceId, item, phase: 'toSource' };
  const def = getStationDef(maker.def);
  if (def.kind === 'assembler') {
    const needs = [...def.inputs].sort((a, b) => (shop.stations[maker.instanceId].inputs[a.item] ?? 0) - (shop.stations[maker.instanceId].inputs[b.item] ?? 0));
    for (const inp of needs) {
      if (roomAt(world, shopId, maker.instanceId, inp.item) <= 0) continue;
      const src = producerOf(world, shopId, inp.item);
      if (src && shop.stations[src.instanceId].outputCount > 0)
        return { from: src.instanceId, to: maker.instanceId, item: inp.item, phase: 'toSource' };
    }
  }
  return null;
}

/** Tìm chỗ nhận món đang cầm sẵn trên tay (món thừa từ chuyến trước). */
function targetForCarry(world: WorldState, shopId: ShopId, item: ItemId): string | null {
  for (const p of SHOPS[shopId].stations) if (roomAt(world, shopId, p.instanceId, item) > 0) return p.instanceId;
  return null;
}

function pickupOpen(world: WorldState, shopId: ShopId): boolean {
  const p = pickupOf(shopId);
  return !!p && world.shops[shopId].stations[p.instanceId].unlocked;
}

/** Nguồn lấy món cho nhân viên giao đơn: đầu ra máy làm món, không có thì kệ món đó. */
function courierSource(world: WorldState, shopId: ShopId, item: ItemId): string | null {
  const shop = world.shops[shopId];
  const maker = producerOf(world, shopId, item);
  if (maker && shop.stations[maker.instanceId].outputCount > 0) return maker.instanceId;
  const shelf = shelfOf(world, shopId, item);
  if (shelf && shop.stations[shelf.instanceId].stock > 0) return shelf.instanceId;
  return null;
}

/** Nhân viên giao đơn: lấy món shipper đang cần, mang ra điểm giao. */
function tickCourier(world: WorldState, shopId: ShopId, s: StaffState, dt: number): SimEvent[] {
  const shop = world.shops[shopId];
  const pickup = pickupOf(shopId);
  if (!pickup) return [];
  const needs = pickupNeeds(shop);
  const events: SimEvent[] = [];

  if (!s.task) {
    s.timer = 0;
    const carried = s.carry.find((it) => needs.includes(it));
    if (carried) s.task = { from: pickup.instanceId, to: pickup.instanceId, item: carried, phase: 'toTarget' };
    else if (s.carry.length > 0) {
      // Món không còn ai cần (đơn bị huỷ): trả về chỗ nhận được.
      const to = targetForCarry(world, shopId, s.carry[0]);
      if (to) s.task = { from: to, to, item: s.carry[0], phase: 'toTarget' };
    }
    // Không có chỗ trả món thừa vẫn đi lấy món shipper cần nếu tay còn chỗ.
    if (!s.task && s.carry.length < staffStats(s).carry) {
      for (const item of needs) {
        const from = courierSource(world, shopId, item);
        if (from) {
          s.task = { from, to: pickup.instanceId, item, phase: 'toSource' };
          break;
        }
      }
    }
    if (!s.task) {
      walk(s, pickup.workPoint.x, pickup.workPoint.z, dt);
      return events;
    }
  }

  const t = s.task;
  const from = placedOf(shopId, t.from);
  const to = placedOf(shopId, t.to);
  switch (t.phase) {
    case 'toSource':
      if (walk(s, from.workPoint.x, from.workPoint.z, dt)) t.phase = 'picking';
      break;
    case 'picking': {
      const st = shop.stations[t.from];
      const isShelf = getStationDef(from.def).kind === 'display';
      const available = isShelf ? st.stock : st.outputCount;
      const have = s.carry.filter((i) => i === t.item).length;
      const want = Math.min(have + staffStats(s).carry - s.carry.length, needs.filter((i) => i === t.item).length);
      if (have >= want || available <= 0) {
        if (have > 0) t.phase = 'toTarget';
        else s.task = null;
        break;
      }
      s.timer += dt;
      if (s.timer >= BALANCE.PICK_INTERVAL - 1e-6) {
        s.timer = 0;
        if (isShelf) st.stock -= 1;
        else st.outputCount -= 1;
        s.carry.push(t.item);
      }
      break;
    }
    case 'toTarget':
      if (walk(s, to.workPoint.x, to.workPoint.z, dt)) {
        t.phase = 'dropping';
        s.timer = 0;
      }
      break;
    case 'dropping': {
      const idx = s.carry.lastIndexOf(t.item);
      if (idx < 0) {
        s.task = null;
        break;
      }
      s.timer += dt;
      if (s.timer < BALANCE.DROP_INTERVAL - 1e-6) break;
      s.timer = 0;
      if (t.to === pickup.instanceId) {
        if (!pickupNeeds(shop).includes(t.item)) {
          s.task = null;
          break;
        }
        s.carry.splice(idx, 1);
        events.push(...deliverToPickup(world, shopId, t.item));
      } else if (roomAt(world, shopId, t.to, t.item) > 0) {
        s.carry.splice(idx, 1);
        const st = shop.stations[t.to];
        if (getStationDef(to.def).kind === 'display') st.stock += 1;
        else st.inputs[t.item] = (st.inputs[t.item] ?? 0) + 1;
      } else s.task = null;
      break;
    }
  }
  return events;
}

/** Khe giữa các kệ (z=0): nhân viên dọn bàn đi qua đây để sang khu bàn ăn, không đi xuyên kệ. */
const SHELF_GAPS = [-5, -2.5, 0, 2.5, 5];
const KITCHEN_SIDE_Z = SHELF_ROW_Z - 0.85;
const DINING_SIDE_Z = SHELF_ROW_Z + 1.7;

function routeTo(from: { x: number; z: number }, to: { x: number; z: number }): { x: number; z: number }[] {
  const front = (p: { z: number }) => p.z > SHELF_ROW_Z + 0.6;
  if (front(from) === front(to)) return [to];
  // Đang đứng trong khe giữa hai kệ: đi tiếp theo đúng khe đó.
  const inGap = from.z > KITCHEN_SIDE_Z - 0.01 && from.z < DINING_SIDE_Z + 0.01;
  const gx = inGap
    ? SHELF_GAPS.reduce((best, g) => (Math.abs(from.x - g) < Math.abs(from.x - best) ? g : best))
    : SHELF_GAPS.reduce((best, g) => (Math.abs(from.x - g) + Math.abs(g - to.x) < Math.abs(from.x - best) + Math.abs(best - to.x) ? g : best));
  const a = { x: gx, z: front(from) ? DINING_SIDE_Z : KITCHEN_SIDE_Z };
  const b = { x: gx, z: front(to) ? DINING_SIDE_Z : KITCHEN_SIDE_Z };
  return [a, b, to];
}

/** Dọn bàn: tới bàn bẩn nhất, dọn từng chỗ; hết việc thì đứng chờ ở bàn vừa dọn. */
function tickCleaner(world: WorldState, shopId: ShopId, s: StaffState, dt: number): SimEvent[] {
  const shop = world.shops[shopId];
  const tables = SHOPS[shopId].stations.filter((p) => p.seatPoints && shop.stations[p.instanceId].unlocked);
  const dirtyCount = (id: string) => shop.stations[id].seats.filter((x) => x === 'dirty').length;
  if (s.target && (!shop.stations[s.target]?.unlocked || dirtyCount(s.target) === 0)) {
    s.target = null;
    s.path = [];
  }
  if (!s.target) {
    let best: (typeof tables)[number] | null = null;
    for (const t of tables) {
      const n = dirtyCount(t.instanceId);
      if (n === 0) continue;
      if (!best || n > dirtyCount(best.instanceId) || (n === dirtyCount(best.instanceId) && Math.hypot(t.x - s.x, t.z - s.z) < Math.hypot(best.x - s.x, best.z - s.z)))
        best = t;
    }
    if (!best) return [];
    s.target = best.instanceId;
    s.path = routeTo(s, best.workPoint);
    s.timer = 0;
  }
  const path = (s.path ??= []);
  if (path.length) {
    if (walk(s, path[0].x, path[0].z, dt)) path.shift();
    return [];
  }
  const placed = placedOf(shopId, s.target);
  s.timer += dt;
  const cleanSec = (BALANCE.CLEAN_SEC * BALANCE.PLAYER_SPEED) / staffStats(s).speed;
  if (s.timer < cleanSec - 1e-6) return [];
  s.timer = 0;
  const st = shop.stations[s.target];
  st.seats[st.seats.indexOf('dirty')] = 'free';
  world.dayStats.cleaned += 1;
  return [{ type: 'clean', shopId, instanceId: s.target, x: placed.x, z: placed.z }];
}

/** Người làm trang trại: lô có thùng hàng → nhặt (đầy tay hoặc hết hàng) → bê ra xe chở hàng. */
function tickFarmhand(world: WorldState, shopId: ShopId, s: StaffState, dt: number): SimEvent[] {
  const shop = world.shops[shopId];
  const truck = SHOPS[shopId].stations.find((p) => getStationDef(p.def).kind === 'truck');
  if (!truck) return [];
  const cap = staffStats(s).carry;
  if (!s.task) {
    s.timer = 0;
    if (s.carry.length > 0) s.task = { from: truck.instanceId, to: truck.instanceId, item: s.carry[0], phase: 'toTarget' };
    else {
      let best: (typeof SHOPS)[ShopId]['stations'][number] | null = null;
      for (const p of SHOPS[shopId].stations) {
        const st = shop.stations[p.instanceId];
        if (getStationDef(p.def).kind !== 'plot' || !st.unlocked || st.outputCount <= 0) continue;
        // Người làm khác đang tới lô này thì chọn lô khác (nếu có).
        const taken = shop.staff.some((o) => o !== s && o.task?.from === p.instanceId);
        const score = (taken ? 0 : 100) + st.outputCount;
        const bestTaken = best && shop.staff.some((o) => o !== s && o.task?.from === best!.instanceId);
        if (!best || score > (bestTaken ? 0 : 100) + shop.stations[best.instanceId].outputCount) best = p;
      }
      if (!best) {
        walk(s, truck.workPoint.x, truck.workPoint.z, dt);
        return [];
      }
      const crop = plotDef(shop, best);
      if (!crop) return [];
      s.task = { from: best.instanceId, to: truck.instanceId, item: crop.output, phase: 'toSource' };
    }
  }
  const t = s.task!;
  const from = placedOf(shopId, t.from);
  switch (t.phase) {
    case 'toSource':
      if (walk(s, from.workPoint.x, from.workPoint.z, dt)) t.phase = 'picking';
      return [];
    case 'picking': {
      const src = shop.stations[t.from];
      if (src.outputCount <= 0 || s.carry.length >= cap) {
        if (s.carry.length > 0) t.phase = 'toTarget';
        else s.task = null;
        return [];
      }
      s.timer += dt;
      if (s.timer >= BALANCE.PICK_INTERVAL - 1e-6) {
        s.timer = 0;
        src.outputCount -= 1;
        s.carry.push(t.item);
      }
      return [];
    }
    case 'toTarget':
      if (walk(s, truck.workPoint.x, truck.workPoint.z, dt)) {
        t.phase = 'dropping';
        s.timer = 0;
      }
      return [];
    case 'dropping': {
      s.timer += dt;
      if (s.timer < BALANCE.DROP_INTERVAL - 1e-6) return [];
      s.timer = 0;
      const crate = s.carry.pop();
      if (!crate) {
        s.task = null;
        return [];
      }
      loadCrate(world, crate);
      if (s.carry.length === 0) s.task = null;
      return [{ type: 'stored', shopId, item: crate, x: truck.x, z: truck.z }];
    }
  }
  return [];
}

export function tickStaff(world: WorldState, shopId: ShopId, dt: number): SimEvent[] {
  const events: SimEvent[] = [];
  const shop = world.shops[shopId];
  for (const s of shop.staff) {
    if (s.role === 'courier') {
      events.push(...tickCourier(world, shopId, s, dt));
      continue;
    }
    if (s.role === 'cleaner') {
      events.push(...tickCleaner(world, shopId, s, dt));
      continue;
    }
    if (s.role === 'farmhand') {
      events.push(...tickFarmhand(world, shopId, s, dt));
      continue;
    }
    if (s.role === 'cashier') {
      const wp = placedOf(shopId, SHOPS[shopId].stations.find((p) => getStationDef(p.def).kind === 'cashier')!.instanceId).workPoint;
      walk(s, wp.x, wp.z, dt);
      continue;
    }

    if (!s.task) {
      if (s.carry.length > 0) {
        const to = targetForCarry(world, shopId, s.carry[0]);
        if (to) s.task = { from: to, to, item: s.carry[0], phase: 'toTarget' };
      }
      // Tay trống, hoặc cầm món thừa chưa có chỗ trả: vẫn nhận việc khác nếu còn chỗ trên tay.
      if (!s.task && s.carry.length < staffStats(s).carry) s.task = chooseJob(world, shopId, s);
      s.timer = 0;
      if (!s.task) {
        // Rảnh: đứng chờ ở lối bếp, mỗi người một chỗ.
        const idx = shop.staff.filter((o) => o.role === 'cook').indexOf(s);
        walk(s, -3.75 + (idx % 4) * 2.5, BALANCE.STAFF_DOOR.z, dt);
        continue;
      }
    }

    const t = s.task;
    const from = placedOf(shopId, t.from);
    const to = placedOf(shopId, t.to);
    switch (t.phase) {
      case 'toSource':
        if (walk(s, from.workPoint.x, from.workPoint.z, dt)) {
          t.phase = 'picking';
          s.timer = 0;
        }
        break;
      case 'picking': {
        const src = shop.stations[t.from];
        const have = s.carry.filter((i) => i === t.item).length;
        const handsFree = staffStats(s).carry - s.carry.length;
        const want = Math.min(have + handsFree, roomAt(world, shopId, t.to, t.item));
        if (have >= want || handsFree <= 0 || src.outputCount <= 0) {
          if (have > 0) t.phase = 'toTarget';
          else s.task = null;
          break;
        }
        s.timer += dt;
        if (s.timer >= BALANCE.PICK_INTERVAL - 1e-6) {
          s.timer = 0;
          src.outputCount -= 1;
          s.carry.push(t.item);
        }
        break;
      }
      case 'toTarget':
        if (walk(s, to.workPoint.x, to.workPoint.z, dt)) {
          t.phase = 'dropping';
          s.timer = 0;
        }
        break;
      case 'dropping': {
        const idx = s.carry.lastIndexOf(t.item);
        if (idx < 0 || roomAt(world, shopId, t.to, t.item) <= 0) {
          s.task = null;
          break;
        }
        s.timer += dt;
        if (s.timer >= BALANCE.DROP_INTERVAL - 1e-6) {
          s.timer = 0;
          s.carry.splice(idx, 1);
          const st = shop.stations[t.to];
          const def = getStationDef(to.def);
          if (def.kind === 'display') st.stock += 1;
          else st.inputs[t.item] = (st.inputs[t.item] ?? 0) + 1;
        }
        break;
      }
    }
  }
  return events;
}
