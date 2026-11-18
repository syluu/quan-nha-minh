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
 * Bàn ăn xếp theo hàng: trong quán 2 hàng × 4 bàn, ngoài vỉa hè 1 hàng 4 bàn.
 * Hai chỗ ngồi ở phía trong (gần quầy), người dọn đứng ở đầu bàn bên phải (khe giữa hai cột bàn).
 * Khách và người dọn đi theo lối giữa các hàng (DINING_LANES), không đi xuyên bàn.
 */
const TABLE_COLS = [2.5, -0.5, -3.5, -6.5]; // mở từ gần quầy thu ngân sang trái
const TABLE_ROWS = [3.4 + SHELF_ROW_Z, 5.6 + SHELF_ROW_Z];
/** Hàng bàn vỉa hè: ngoài mép sàn quán (z = 9), trước chỗ xe du lịch đỗ. */
export const SIDEWALK_TABLE_Z = 10.8 + SHELF_ROW_Z;

function table(n: number, x: number, z: number, def: string, cost: number, requires: string): PlacedStation {
  return {
    instanceId: `ban_an_${n}`,
    def,
    x,
    z,
    workPoint: { x: x + 1.1, z },
    seatPoints: [
      { x: x - 0.3, z: z - 0.75 },
      { x: x + 0.3, z: z - 0.75 },
    ],
    unlockCost: cost,
    requires: [requires],
  };
}

const inside = TABLE_ROWS.flatMap((z, r) => TABLE_COLS.map((x, c) => ({ x, z, n: r * TABLE_COLS.length + c + 1 })));
export const DINING_TABLES: PlacedStation[] = [
  ...inside.map(({ x, z, n }) => table(n, x, z, 'ban_an', n <= 4 ? K(500) : K(800), n === 1 ? 'thu_ngan' : `ban_an_${n - 1}`)),
  // Bàn vỉa hè: mở được khi đã có 4 bàn đầu trong quán.
  ...TABLE_COLS.map((x, i) => table(9 + i, x, SIDEWALK_TABLE_Z, 'ban_via_he', K(1200), i === 0 ? 'ban_an_4' : `ban_an_${8 + i}`)),
];

/**
 * Lối đi trong khu bàn: các đường ngang (z) không cắt bàn nào — trước kệ, hàng ghế mỗi dãy bàn, giữa quán và vỉa hè,
 * sau bàn vỉa hè — và các đường dọc (x) ở khe giữa các cột bàn. Khách / người dọn đi theo lưới này khi đường thẳng vướng bàn.
 */
export const DINING_LANES = {
  z: [1.2 + SHELF_ROW_Z, ...TABLE_ROWS.map((z) => z - 0.75), 6.8 + SHELF_ROW_Z, SIDEWALK_TABLE_Z - 0.75, SIDEWALK_TABLE_Z + 1.2],
  x: [-7.6, -5, -2, 1, 4.6, 7],
};

/** Quán có bàn: sâu hơn (tới z=8), vào ở góc trước-phải, ra ở cửa hông phải cạnh quầy thu ngân. */
export const DINING_FRAME = {
  bounds: { minX: -8, maxX: 8, minZ: -5.5, maxZ: 8 + SHELF_ROW_Z },
  entrance: { x: 7.5, z: 7.7 + SHELF_ROW_Z },
  exit: { x: 7.8, z: 2.4 + SHELF_ROW_Z },
  queueDir: { x: 0, z: 1 },
  shipperSpawn: { x: 10.5, z: 6.5 + SHELF_ROW_Z },
  portal: { x: -3, z: 7.3 + SHELF_ROW_Z },
  lanes: DINING_LANES,
  /** Người chơi đi được ra vỉa hè (tới hàng bàn vỉa hè). */
  walkMaxZ: SIDEWALK_TABLE_Z + 1.3,
};
