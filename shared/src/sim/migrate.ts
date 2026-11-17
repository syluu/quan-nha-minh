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
  // Đánh số tháng theo ngày đã chơi (1 tháng = 7 ngày).
  w.month ??= Math.floor(((w.day ?? 1) - 1) / 7) + 1;
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

/** Kế hoạch 3 → 4: bán online. */
export function migrateV3toV4(raw: any): any {
  const w = structuredClone(raw);
  w.schemaVersion = 4;
  w.dayStats = { commission: 0, onlineOrders: 0, onlineCancelled: 0, ...w.dayStats };
  for (const h of w.history ?? []) {
    h.commission ??= 0;
    h.onlineOrders ??= 0;
    h.onlineCancelled ??= 0;
  }
  for (const shop of Object.values<any>(w.shops ?? {})) {
    shop.orders ??= [];
    shop.nextOrderId ??= 1;
    shop.nextOrderIn ??= 5;
    shop.shipper ??= null;
    shop.onlinePaused ??= false;
  }
  return w;
}

/** Kế hoạch 4 → 5: nhiều quán, bàn ăn, công tắc máy. Mọi người về quán bánh mì; 2 quán mới chưa thuê. */
export function migrateV4toV5(raw: any, freshShops: Record<string, any>): any {
  const w = structuredClone(raw);
  w.schemaVersion = 5;
  w.extraWagesOwed ??= 0;
  for (const [id, shop] of Object.entries<any>(w.shops ?? {})) {
    shop.owned ??= id === 'banh_mi';
    shop.rentedDay ??= 0;
    for (const st of Object.values<any>(shop.stations ?? {})) {
      st.enabled ??= true;
      st.seats ??= [];
    }
    for (const c of shop.customers ?? []) {
      c.table ??= null;
      c.seat ??= 0;
      c.eatTimer ??= 0;
    }
  }
  for (const [id, fresh] of Object.entries<any>(freshShops)) w.shops[id] ??= structuredClone(fresh);
  for (const p of Object.values<any>(w.players ?? {})) p.location ??= 'banh_mi';
  return w;
}

/** Kế hoạch 5 → 6: trang trại (chưa thuê) và kho tổng rỗng. */
export function migrateV5toV6(raw: any, freshShops: Record<string, any>): any {
  const w = structuredClone(raw);
  w.schemaVersion = 6;
  w.warehouse ??= {};
  for (const [id, fresh] of Object.entries<any>(freshShops)) w.shops[id] ??= structuredClone(fresh);
  return w;
}
