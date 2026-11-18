/** Các trường snapshot v3 mặc định cho dữ liệu test. */
export const V3 = {
  month: 1,
  daysToMonthEnd: 7,
  campaigns: [],
  ads: [],
  loans: [],
  maxLoan: 2_000_000,
  settlement: null,
  sellable: [],
  online: { registered: false, paused: false, vehicle: 'bike' as const, pending: 0, shipper: null, ordersToday: 0, cancelledToday: 0 },
};
