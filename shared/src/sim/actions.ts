/** Kết quả một thao tác quản lý (thuê, sa thải, đổi giá…). */
export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: 'BAD_ITEM' | 'NO_SLOT' | 'LINE_TAKEN' | 'NOT_FOUND' | 'BAD_ROLE' | 'NO_MONEY' | 'MAXED' | 'BAD_AMOUNT' | 'NOT_SELLABLE' | 'NO_SETTLEMENT' | 'PAUSED' | 'NOT_READY';
    };
