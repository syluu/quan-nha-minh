import { K } from '../../money';
import type { ShopLayout } from '../stations';

/**
 * Xe bánh mì (bố cục Kế hoạch 2, 16×11 m).
 * Hàng máy z=-3.8, hàng kệ + thu ngân z=0, khách đứng z=+1.2.
 * Mọi trạm cách nhau 2,5 m → vùng nhặt/đặt đồ (0,6 m) không chồng nhau.
 * Lối bếp (z -3.3 … -0.4) là nơi người chơi/nhân viên đi lại; vào bếp qua khe giữa các kệ.
 */
const KITCHEN_Z = -3.8;
const SHELF_Z = 0;
const CUST_Z = 1.2;
const KITCHEN_WORK_Z = -2.9;
const SHELF_WORK_Z = -0.85;

const kitchen = (x: number) => ({ x, z: KITCHEN_Z, workPoint: { x, z: KITCHEN_WORK_Z } });
const shelf = (x: number) => ({ x, z: SHELF_Z, customerPoint: { x, z: CUST_Z }, workPoint: { x, z: SHELF_WORK_Z } });

export const BANH_MI_SHOP: ShopLayout = {
  id: 'banh_mi',
  name: 'Xe bánh mì',
  bounds: { minX: -8, maxX: 8, minZ: -5.5, maxZ: 5.5 },
  entrance: { x: 7.5, z: 5.2 },
  exit: { x: -7.5, z: 5.3 },
  queueDir: { x: 0, z: 1 },
  shipperSpawn: { x: 10.5, z: 4.6 },
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
    { instanceId: 'lo_banh_mi', def: 'lo_banh_mi', ...kitchen(-6.25), unlockCost: 0, requires: [] },
    { instanceId: 'ke_banh_mi', def: 'ke_banh_mi', ...shelf(-6.25), unlockCost: 0, requires: [] },
    { instanceId: 'thu_ngan', def: 'thu_ngan', ...shelf(6.25), unlockCost: 0, requires: [] },
    { instanceId: 'thung_rac', def: 'thung_rac', x: -7.6, z: -1.85, workPoint: { x: -7.6, z: -1.2 }, unlockCost: 0, requires: [] },

    { instanceId: 'chao_op_la', def: 'chao_op_la', ...kitchen(-3.75), unlockCost: K(800), requires: ['ke_banh_mi'] },
    { instanceId: 'ban_bm_trung', def: 'ban_bm_trung', ...kitchen(-1.25), unlockCost: K(1500), requires: ['chao_op_la'] },
    { instanceId: 'ke_bm_trung', def: 'ke_bm_trung', ...shelf(-3.75), unlockCost: K(300), requires: ['ban_bm_trung'] },

    { instanceId: 'lo_than', def: 'lo_than', ...kitchen(1.25), unlockCost: K(1200), requires: ['ke_bm_trung'] },
    { instanceId: 'ke_thit_nuong', def: 'ke_thit_nuong', ...shelf(-1.25), unlockCost: K(300), requires: ['lo_than'] },

    { instanceId: 'ban_bm_thit', def: 'ban_bm_thit', ...kitchen(3.75), unlockCost: K(2000), requires: ['ke_thit_nuong'] },
    { instanceId: 'ke_bm_thit', def: 'ke_bm_thit', ...shelf(1.25), unlockCost: K(300), requires: ['ban_bm_thit'] },

    // Bán online: điểm giao ở cuối lối bếp bên phải, shipper đứng ngoài mép phải quán.
    {
      instanceId: 'diem_giao', def: 'diem_giao', x: 7.6, z: -1.85, workPoint: { x: 6.85, z: -1.85 },
      shipperPoint: { x: 8.6, z: -1.85 }, unlockCost: K(2000), requires: ['ke_banh_mi'],
    },

    { instanceId: 'binh_tra', def: 'binh_tra', ...kitchen(6.25), unlockCost: K(300), requires: ['ke_banh_mi'] },
    { instanceId: 'ke_tra_da', def: 'ke_tra_da', ...shelf(3.75), unlockCost: K(200), requires: ['binh_tra'] },
  ],
};
