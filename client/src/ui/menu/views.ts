import { BALANCE, ITEMS, SHOPS, formatK, getStationDef, priceRange } from '@qnm/shared';
import type { ItemId, Snapshot } from '@qnm/shared';

/** Các món có kệ đang mở, theo thứ tự trong bố cục quán. */
function openItems(s: Snapshot): ItemId[] {
  const unlocked = new Set(s.stations.filter((st) => st.unlocked).map((st) => st.instanceId));
  const items: ItemId[] = [];
  for (const p of SHOPS.banh_mi.stations) {
    const def = getStationDef(p.def);
    if (def.kind === 'display' && unlocked.has(p.instanceId)) items.push(def.item);
  }
  return items;
}

export function staffView(s: Snapshot): {
  cashier: { name: string | null; staffId: string | null; canHire: boolean };
  lines: { item: ItemId; itemName: string; staffName: string | null; staffId: string | null }[];
  wagePerDay: string;
} {
  const cashier = s.staff.find((x) => x.role === 'cashier');
  return {
    cashier: { name: cashier?.name ?? null, staffId: cashier?.id ?? null, canHire: !cashier },
    lines: openItems(s).map((item) => {
      const cook = s.staff.find((x) => x.role === 'cook' && x.item === item);
      return { item, itemName: ITEMS[item].name, staffName: cook?.name ?? null, staffId: cook?.id ?? null };
    }),
    wagePerDay: formatK(BALANCE.STAFF_LEVELS[0].wage),
  };
}

export function priceView(s: Snapshot): { item: ItemId; name: string; current: string; market: string; base: number; min: number; max: number; value: number }[] {
  return openItems(s).map((item) => {
    const r = priceRange(item);
    const value = s.prices[item] ?? r.base;
    return { item, name: ITEMS[item].name, current: formatK(value), market: formatK(r.base), base: r.base, min: r.min, max: r.max, value };
  });
}

const ERRORS: Record<string, string> = {
  NO_SLOT: 'Đã đủ người cho việc này',
  LINE_TAKEN: 'Món này đã có người phụ trách',
  BAD_ITEM: 'Món này chưa bán',
  NOT_FOUND: 'Không tìm thấy nhân viên',
};

export function actionErrorText(e: string): string {
  return ERRORS[e] ?? 'Không thực hiện được';
}
