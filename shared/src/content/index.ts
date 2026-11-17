import type { ShopId } from './ids';
import { BANH_MI_SHOP } from './shops/banhMi';
import type { PlacedStation, ShopLayout } from './stations';

export * from './ids';
export * from './stations';
export { INGREDIENTS } from './ingredients';
export { ITEMS } from './items';
export { BALANCE } from './balance';

export const SHOPS: Record<ShopId, ShopLayout> = {
  banh_mi: BANH_MI_SHOP,
};

export function getPlaced(shopId: ShopId, instanceId: string): PlacedStation {
  const p = SHOPS[shopId].stations.find((s) => s.instanceId === instanceId);
  if (!p) throw new Error(`Unknown station instance ${shopId}/${instanceId}`);
  return p;
}
