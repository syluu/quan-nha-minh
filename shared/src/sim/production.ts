import { INGREDIENTS, SHOPS, getStationDef } from '../content';
import type { ShopId } from '../content';
import type { WorldState } from './world';

const EPS = 1e-6;

/** Máy tự chạy: bắt đầu chu kỳ khi đủ đầu vào + đủ tiền nguyên liệu (trừ ngay), ra món sau cycleSec. */
export function tickStations(world: WorldState, shopId: ShopId, dt: number): void {
  const shop = world.shops[shopId];
  for (const placed of SHOPS[shopId].stations) {
    const def = getStationDef(placed.def);
    if (def.kind !== 'producer' && def.kind !== 'assembler') continue;
    const st = shop.stations[placed.instanceId];
    if (!st.unlocked) continue;

    if (!st.running) {
      if (st.outputCount >= def.outputCap) {
        st.blocked = 'full';
        continue;
      }
      if (def.kind === 'assembler' && def.inputs.some((i) => (st.inputs[i.item] ?? 0) < i.qty)) {
        st.blocked = 'no_input';
        continue;
      }
      const cost = def.ingredients.reduce((sum, ing) => sum + INGREDIENTS[ing.id].marketPrice * ing.qty, 0);
      if (world.money < cost) {
        st.blocked = 'no_money';
        continue;
      }
      world.money -= cost;
      world.dayStats.ingredientCost += cost;
      if (def.kind === 'assembler') for (const i of def.inputs) st.inputs[i.item] = (st.inputs[i.item] ?? 0) - i.qty;
      st.running = true;
      st.progress = 0;
      st.blocked = null;
    }

    st.progress += dt;
    if (st.progress >= def.cycleSec - EPS) {
      st.outputCount += 1;
      st.running = false;
      st.progress = 0;
    }
  }
}
