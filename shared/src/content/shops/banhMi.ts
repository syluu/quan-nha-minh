import { K } from '../../money';
import type { ShopLayout } from '../stations';

/**
 * Xe bánh mì. Phía sau (z âm) là bếp, hàng giữa z=0 là kệ + thu ngân,
 * khách đứng ở z=+1.2 phía trước kệ. Khe trống giữa kệ bánh mì và kệ BM trứng
 * (x -4..-2) là lối người chơi đi ra/vào bếp.
 */
const KITCHEN_Z = -2.5;
const SHELF_Z = 0;
const CUST_Z = 1.2;

export const BANH_MI_SHOP: ShopLayout = {
  id: 'banh_mi',
  name: 'Xe bánh mì',
  bounds: { minX: -6, maxX: 6, minZ: -4.5, maxZ: 4.5 },
  entrance: { x: 5.5, z: 4.2 },
  exit: { x: -5.5, z: 4.4 },
  queueDir: { x: 0, z: 1 },
  baseCustomerIntervalSec: 4,
  hourCurve: [
    [6, 9, 1.8],
    [9, 11, 0.8],
    [11, 13, 1.2],
    [13, 17, 0.6],
    [17, 20, 1.0],
    [20, 22, 0.5],
  ],
  stations: [
    { instanceId: 'lo_banh_mi', def: 'lo_banh_mi', x: -4.5, z: KITCHEN_Z, unlockCost: 0, requires: [] },
    { instanceId: 'ke_banh_mi', def: 'ke_banh_mi', x: -4.5, z: SHELF_Z, unlockCost: 0, requires: [], customerPoint: { x: -4.5, z: CUST_Z } },
    { instanceId: 'thu_ngan', def: 'thu_ngan', x: 4.6, z: SHELF_Z, unlockCost: 0, requires: [], customerPoint: { x: 4.6, z: CUST_Z } },

    { instanceId: 'binh_tra', def: 'binh_tra', x: 3.0, z: KITCHEN_Z, unlockCost: K(300), requires: ['ke_banh_mi'] },
    { instanceId: 'ke_tra_da', def: 'ke_tra_da', x: 3.0, z: SHELF_Z, unlockCost: K(200), requires: ['binh_tra'], customerPoint: { x: 3.0, z: CUST_Z } },

    { instanceId: 'chao_op_la', def: 'chao_op_la', x: -3.0, z: KITCHEN_Z, unlockCost: K(800), requires: ['ke_banh_mi'] },
    { instanceId: 'ban_bm_trung', def: 'ban_bm_trung', x: -1.5, z: KITCHEN_Z, unlockCost: K(1500), requires: ['chao_op_la'] },
    { instanceId: 'ke_bm_trung', def: 'ke_bm_trung', x: -1.5, z: SHELF_Z, unlockCost: K(300), requires: ['ban_bm_trung'], customerPoint: { x: -1.5, z: CUST_Z } },

    { instanceId: 'lo_than', def: 'lo_than', x: 0, z: KITCHEN_Z, unlockCost: K(1200), requires: ['ke_bm_trung'] },
    { instanceId: 'ke_thit_nuong', def: 'ke_thit_nuong', x: 0, z: SHELF_Z, unlockCost: K(300), requires: ['lo_than'], customerPoint: { x: 0, z: CUST_Z } },

    { instanceId: 'ban_bm_thit', def: 'ban_bm_thit', x: 1.5, z: KITCHEN_Z, unlockCost: K(2000), requires: ['ke_thit_nuong'] },
    { instanceId: 'ke_bm_thit', def: 'ke_bm_thit', x: 1.5, z: SHELF_Z, unlockCost: K(300), requires: ['ban_bm_thit'], customerPoint: { x: 1.5, z: CUST_Z } },
  ],
};
