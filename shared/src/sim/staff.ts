import { BALANCE, ITEMS, SHOPS, getStationDef } from '../content';
import type { ItemId, ShopId } from '../content';
import type { ActionResult } from './actions';
import { addLog, playerName } from './log';
import { isOnSale } from './prices';
import type { StaffRole, StaffState, WorldState } from './world';

const ROLE_LABEL = (s: Pick<StaffState, 'role' | 'item'>) =>
  s.role === 'cashier' ? 'thu ngân' : `phụ bếp ${ITEMS[s.item!].name}`;

/** Các món có kệ đang mở (mỗi món = 1 chỗ phụ bếp). */
function openLines(world: WorldState, shopId: ShopId): ItemId[] {
  const items: ItemId[] = [];
  for (const p of SHOPS[shopId].stations) {
    const def = getStationDef(p.def);
    if (def.kind === 'display' && world.shops[shopId].stations[p.instanceId].unlocked) items.push(def.item);
  }
  return items;
}

export function staffSlots(world: WorldState, shopId: ShopId): {
  cashier: { max: 1; used: number };
  cookLines: { item: ItemId; taken: string | null }[];
} {
  const staff = world.shops[shopId].staff;
  return {
    cashier: { max: 1, used: staff.filter((s) => s.role === 'cashier').length },
    cookLines: openLines(world, shopId).map((item) => ({
      item,
      taken: staff.find((s) => s.role === 'cook' && s.item === item)?.id ?? null,
    })),
  };
}

export function hireStaff(world: WorldState, shopId: ShopId, role: StaffRole, item: ItemId | null, byPlayerId: string): ActionResult {
  const shop = world.shops[shopId];
  if (role === 'cashier') {
    if (shop.staff.some((s) => s.role === 'cashier')) return { ok: false, error: 'NO_SLOT' };
    item = null;
  } else if (role === 'cook') {
    if (!item || !isOnSale(world, shopId, item)) return { ok: false, error: 'BAD_ITEM' };
    if (shop.staff.some((s) => s.role === 'cook' && s.item === item)) return { ok: false, error: 'LINE_TAKEN' };
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
  };
  shop.staff.push(s);
  addLog(world, `${playerName(world, byPlayerId)} đã thuê ${name} (${ROLE_LABEL(s)})`);
  return { ok: true };
}

export function fireStaff(world: WorldState, shopId: ShopId, staffId: string, byPlayerId: string): ActionResult {
  const shop = world.shops[shopId];
  const s = shop.staff.find((x) => x.id === staffId);
  if (!s) return { ok: false, error: 'NOT_FOUND' };
  shop.staff = shop.staff.filter((x) => x !== s);
  shop.firedToday += 1;
  addLog(world, `${playerName(world, byPlayerId)} đã cho ${s.name} nghỉ`);
  return { ok: true };
}

/**
 * Trả lương cuối ngày. Người bị cho nghỉ hôm nay vẫn được trả trước (nếu đủ tiền);
 * nhân viên đang làm được trả theo thứ tự thuê, ai không trả được thì nghỉ việc. Tiền không bao giờ âm.
 */
export function payWages(world: WorldState): { paid: number; quitNames: string[] } {
  let paid = 0;
  const quitNames: string[] = [];
  for (const id of Object.keys(world.shops) as ShopId[]) {
    const shop = world.shops[id];
    for (let i = 0; i < shop.firedToday; i++) {
      if (world.money < BALANCE.WAGE) break;
      world.money -= BALANCE.WAGE;
      paid += BALANCE.WAGE;
    }
    shop.firedToday = 0;
    shop.staff = shop.staff.filter((s) => {
      if (world.money >= BALANCE.WAGE) {
        world.money -= BALANCE.WAGE;
        paid += BALANCE.WAGE;
        return true;
      }
      quitNames.push(s.name);
      addLog(world, `${s.name} nghỉ việc vì không được trả lương`);
      return false;
    });
  }
  world.dayStats.wages += paid;
  return { paid, quitNames };
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
  const step = Math.min(d, BALANCE.STAFF_SPEED * dt);
  s.x += (dx / d) * step;
  s.z += (dz / d) * step;
  s.dir = Math.atan2(dx, dz);
  return d - step <= ARRIVE;
}

/** Chọn việc tiếp theo cho phụ bếp tay trống (xem thứ tự ưu tiên trong kế hoạch). */
function chooseJob(world: WorldState, shopId: ShopId, s: StaffState): StaffState['task'] {
  const item = s.item!;
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

export function tickStaff(world: WorldState, shopId: ShopId, dt: number): void {
  const shop = world.shops[shopId];
  for (const s of shop.staff) {
    if (s.role === 'cashier') {
      const wp = placedOf(shopId, SHOPS[shopId].stations.find((p) => getStationDef(p.def).kind === 'cashier')!.instanceId).workPoint;
      walk(s, wp.x, wp.z, dt);
      continue;
    }

    if (!s.task) {
      if (s.carry.length > 0) {
        const to = targetForCarry(world, shopId, s.carry[0]);
        if (to) s.task = { from: to, to, item: s.carry[0], phase: 'toTarget' };
      } else {
        s.task = chooseJob(world, shopId, s);
      }
      s.timer = 0;
      if (!s.task) {
        const home = producerOf(world, shopId, s.item!) ?? shelfOf(world, shopId, s.item!);
        if (home) walk(s, home.workPoint.x, home.workPoint.z, dt);
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
        const want = Math.min(BALANCE.STAFF_CARRY, roomAt(world, shopId, t.to, t.item));
        const have = s.carry.filter((i) => i === t.item).length;
        if (have >= want || src.outputCount <= 0) {
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
}
