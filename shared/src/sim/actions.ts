/** Kết quả một thao tác quản lý (thuê, sa thải, đổi giá…). */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: 'BAD_ITEM' | 'NO_SLOT' | 'LINE_TAKEN' | 'NOT_FOUND' | 'BAD_ROLE' };
