import { INGREDIENTS, SHOPS, getStationDef } from '../content';
import type { ShopId } from '../content';
import { effectiveCycle, effectiveOutputCap } from './upgrades';
import type { WorldState } from './world';

const EPS = 1e-6;

/** Máy tự chạy: bắt đầu chu kỳ khi đủ đầu vào + đủ tiền nguyên liệu (trừ ngay), ra món sau cycleSec. */
export function tickStations(world: WorldState, shopId: ShopId, dt: number): void {
  const shop = world.shops[shopId];
  for (const placed of SHOPS[shopId].stations) {
    const def = getStationDef(placed.def);
    if (def.kind !== 'producer' && def.kind !== 'assembler' && def.kind !== 'plot') continue;
    const st = shop.stations[placed.instanceId];
    if (!st.unlocked) continue;

    if (!st.running) {
      // Tắt máy: làm xong mẻ đang chạy rồi mới dừng (không bắt đầu mẻ mới).
      if (!st.enabled) {
        st.blocked = 'off';
        continue;
      }
      if (st.outputCount >= effectiveOutputCap(def, st)) {
        st.blocked = 'full';
        continue;
      }
      if (def.kind === 'assembler' && def.inputs.some((i) => (st.inputs[i.item] ?? 0) < i.qty)) {
        st.blocked = 'no_input';
        continue;
      }
      // Nguyên liệu: lấy kho tổng trước (đã trả lúc trồng/nuôi), thiếu mới mua chợ. Lô trang trại trả tiền giống.
      const ingredients = def.kind === 'plot' ? [] : def.ingredients;
      const fromStore = ingredients.map((ing) => Math.min(ing.qty, world.warehouse[ing.id] ?? 0));
      const cost =
        def.kind === 'plot'
          ? def.seedCost
          : ingredients.reduce((sum, ing, i) => sum + INGREDIENTS[ing.id].marketPrice * (ing.qty - fromStore[i]), 0);
      if (world.money < cost) {
        st.blocked = 'no_money';
        continue;
      }
      ingredients.forEach((ing, i) => {
        if (fromStore[i] > 0) world.warehouse[ing.id] = (world.warehouse[ing.id] ?? 0) - fromStore[i];
      });
      if (fromStore.some((n) => n > 0) && !world.deliveredTo.includes(shopId)) world.deliveredTo.push(shopId);
      world.money -= cost;
      world.dayStats.ingredientCost += cost;
      if (def.kind === 'assembler') for (const i of def.inputs) st.inputs[i.item] = (st.inputs[i.item] ?? 0) - i.qty;
      st.running = true;
      st.progress = 0;
      st.blocked = null;
    }

    st.progress += dt;
    if (st.progress >= effectiveCycle(def, st) - EPS) {
      st.outputCount += 1;
      st.running = false;
      st.progress = 0;
    }
  }
}
