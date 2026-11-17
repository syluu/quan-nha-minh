import { K } from '../../money';
import type { PlacedStation, ShopLayout } from '../stations';

/**
 * Trang trại 16×11: hai hàng lô (ruộng phía sau, chuồng phía trước), lối đi ở giữa (z ≈ -1,25).
 * Người chơi/người làm đứng ở lối đi để nhặt thùng hàng, bê sang xe chở hàng ở cuối lối bên phải.
 */
const BACK_Z = -3.5;
const FRONT_Z = 1.0;
const BACK_WORK_Z = -2.25;
const FRONT_WORK_Z = -0.25;
const XS = [-5.5, -1, 3.5];

const back = (x: number) => ({ x, z: BACK_Z, workPoint: { x, z: BACK_WORK_Z } });
const front = (x: number) => ({ x, z: FRONT_Z, workPoint: { x, z: FRONT_WORK_Z } });

const stations: PlacedStation[] = [
  { instanceId: 'ruong_rau', def: 'ruong_rau', ...back(XS[0]), unlockCost: 0, requires: [] },
  { instanceId: 'xe_cho_hang', def: 'xe_cho_hang', x: 7.3, z: -1.25, workPoint: { x: 6.35, z: -1.25 }, unlockCost: 0, requires: [] },
  { instanceId: 'thung_rac', def: 'thung_rac', x: -7.5, z: 3.5, workPoint: { x: -7.5, z: 2.85 }, unlockCost: 0, requires: [] },

  { instanceId: 'ruong_lua_mi', def: 'ruong_lua_mi', ...back(XS[1]), unlockCost: K(1500), requires: ['ruong_rau'] },
  { instanceId: 'ruong_lua', def: 'ruong_lua', ...back(XS[2]), unlockCost: K(1500), requires: ['ruong_lua_mi'] },
  { instanceId: 'chuong_ga', def: 'chuong_ga', ...front(XS[0]), unlockCost: K(2500), requires: ['ruong_rau'] },
  { instanceId: 'chuong_lon', def: 'chuong_lon', ...front(XS[1]), unlockCost: K(4000), requires: ['chuong_ga'] },
  { instanceId: 'chuong_bo', def: 'chuong_bo', ...front(XS[2]), unlockCost: K(6000), requires: ['chuong_lon'] },
];

export const FARM: ShopLayout = {
  id: 'farm',
  name: 'Trang trại',
  bounds: { minX: -8, maxX: 8, minZ: -5.5, maxZ: 5.5 },
  entrance: { x: 6.5, z: 4.5 },
  exit: { x: 6.5, z: 5.2 },
  queueDir: { x: 0, z: 1 },
  shipperSpawn: { x: 10.5, z: 4.6 },
  baseCustomerIntervalSec: 1e9,
  hourCurve: [],
  stations,
};
