import type { ShopId } from './ids';
import { BANH_MI_SHOP } from './shops/banhMi';
import { COM_TAM_SHOP } from './shops/comTam';
import { PHO_CAFE_SHOP } from './shops/phoCafe';
import { FARM } from './shops/farm';
import type { PlacedStation, ShopLayout } from './stations';

export * from './ids';
export * from './stations';
export { INGREDIENTS } from './ingredients';
export { ITEMS } from './items';
export { BALANCE } from './balance';
export { itemCost } from './costs';
export { SHOP_META, SHOP_IDS, isFarm } from './shops/meta';
export type { ShopMeta } from './shops/meta';

export const SHOPS: Record<ShopId, ShopLayout> = {
  banh_mi: BANH_MI_SHOP,
  com_tam: COM_TAM_SHOP,
  pho_cafe: PHO_CAFE_SHOP,
  farm: FARM,
};

export function getPlaced(shopId: ShopId, instanceId: string): PlacedStation {
  const p = SHOPS[shopId].stations.find((s) => s.instanceId === instanceId);
  if (!p) throw new Error(`Unknown station instance ${shopId}/${instanceId}`);
  return p;
}
export { COSTUMES, COSTUME_LIST, COSTUME_SLOTS, DEFAULT_OUTFIT } from './costumes';
export type { CostumeDef, CostumeSlot, CostumeStyle, Outfit } from './costumes';
export { FUN, EMOTES, FESTIVALS, BADGES, festivalOfDay } from './fun';
export type { Festival, BadgeDef } from './fun';
