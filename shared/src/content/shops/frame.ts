import { K } from '../../money';
import type { PlacedStation } from '../stations';
import { SHELF_ROW_Z } from '../stations';

/**
 * Khung bố cục chung (giống xe bánh mì): hàng máy z=-3.8, hàng kệ + thu ngân z=0, khách đứng z=+1.2.
 * Các ô cách nhau 2,5 m: x = -6.25, -3.75, -1.25, 1.25, 3.75, 6.25.
 */
export const KITCHEN_Z = -3.8;
export const SHELF_Z = SHELF_ROW_Z;
export const CUST_Z = SHELF_ROW_Z + 1.2;
const KITCHEN_WORK_Z = -2.9;
const SHELF_WORK_Z = SHELF_ROW_Z - 0.85;

export const kitchen = (x: number) => ({ x, z: KITCHEN_Z, workPoint: { x, z: KITCHEN_WORK_Z } });
export const shelf = (x: number) => ({ x, z: SHELF_Z, customerPoint: { x, z: CUST_Z }, workPoint: { x, z: SHELF_WORK_Z } });

export const TRASH: PlacedStation = {
  instanceId: 'thung_rac', def: 'thung_rac', x: -7.6, z: -1.85, workPoint: { x: -7.6, z: -1.2 }, unlockCost: 0, requires: [],
};

export function pickupPoint(requires: string): PlacedStation {
  return {
    instanceId: 'diem_giao', def: 'diem_giao', x: 7.6, z: -1.85, workPoint: { x: 6.85, z: -1.85 },
    shipperPoint: { x: 8.6, z: -1.85 }, unlockCost: K(2000), requires: [requires],
  };
}

/**
 * 4 bàn ăn xếp chéo ở khu phía trước-trái, bàn sau cao hơn bàn trước để đường khách
 * (từ thu ngân tới chỗ ngồi, từ chỗ ngồi ra cửa bên phải) không cắt qua bàn nào.
 * Hai chỗ ngồi ở phía trong (gần quầy), người dọn đứng ở đầu bàn bên phải.
 */
export const DINING_TABLES: PlacedStation[] = [
  [-6, 2.8 + SHELF_ROW_Z],
  [-3.5, 4.2 + SHELF_ROW_Z],
  [-1, 5.6 + SHELF_ROW_Z],
  [1.5, 7.0 + SHELF_ROW_Z],
].map(([x, z], i) => ({
  instanceId: `ban_an_${i + 1}`,
  def: 'ban_an',
  x,
  z,
  workPoint: { x: x + 1.1, z },
  seatPoints: [
    { x: x - 0.3, z: z - 0.75 },
    { x: x + 0.3, z: z - 0.75 },
  ],
  unlockCost: K(500),
  requires: [i === 0 ? 'thu_ngan' : `ban_an_${i}`],
}));

/** Quán có bàn: sâu hơn (tới z=8), vào ở góc trước-phải, ra ở cửa hông phải cạnh quầy thu ngân. */
export const DINING_FRAME = {
  bounds: { minX: -8, maxX: 8, minZ: -5.5, maxZ: 8 + SHELF_ROW_Z },
  entrance: { x: 7.5, z: 7.7 + SHELF_ROW_Z },
  exit: { x: 7.8, z: 2.4 + SHELF_ROW_Z },
  queueDir: { x: 0, z: 1 },
  shipperSpawn: { x: 10.5, z: 6.5 + SHELF_ROW_Z },
};
