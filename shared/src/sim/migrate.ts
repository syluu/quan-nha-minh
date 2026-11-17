/* eslint-disable @typescript-eslint/no-explicit-any */

/** File lưu Kế hoạch 1 → Kế hoạch 2: thêm nhân sự, lịch sử ngày, thống kê mới; đổi transferCd → dropCd. */
export function migrateV1toV2(raw: any): any {
  const w = structuredClone(raw);
  w.schemaVersion = 2;
  w.history ??= [];
  w.dayStats = { wages: 0, wasted: 0, sold: {}, ...w.dayStats };
  for (const shop of Object.values<any>(w.shops ?? {})) {
    shop.staff ??= [];
    shop.nextStaffId ??= 1;
    shop.firedToday ??= 0;
  }
  for (const p of Object.values<any>(w.players ?? {})) {
    delete p.transferCd;
    p.dropCd = 0;
    p.pickTimer = 0;
    p.pickAt = null;
  }
  return w;
}
