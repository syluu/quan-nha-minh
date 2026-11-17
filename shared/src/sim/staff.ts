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
