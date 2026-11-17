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
    p.inMenu = false;
  }
  return w;
}

/** Kế hoạch 2 → 3: cấp nhân viên/nhân vật/máy, quảng cáo, ngân hàng, kết toán tháng. */
export function migrateV2toV3(raw: any): any {
  const w = structuredClone(raw);
  w.schemaVersion = 3;
  w.loans ??= [];
  w.nextLoanId ??= 1;
  w.settlement ??= null;
  w.month ??= 1;
  w.months ??= [];
  w.dayStats = { marketing: 0, ...w.dayStats };
  for (const h of w.history ?? []) h.marketing ??= 0;
  for (const shop of Object.values<any>(w.shops ?? {})) {
    shop.campaigns ??= [];
    for (const st of Object.values<any>(shop.stations ?? {})) {
      st.level ??= 0;
      st.upgradeSpent ??= 0;
    }
    for (const s of shop.staff ?? []) {
      s.level ??= 1;
      s.wageOwed ??= 0;
    }
  }
  for (const p of Object.values<any>(w.players ?? {})) {
    p.carryLevel ??= 0;
    p.speedLevel ??= 0;
  }
  return w;
}
