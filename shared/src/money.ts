/** Tiền trong game luôn là số nguyên đồng. K = 1.000đ. */
export function K(k: number): number {
  return Math.round(k * 1000);
}

/** Hiển thị tiền dạng "2.987,5K" (dấu chấm hàng nghìn, dấu phẩy thập phân, tối đa 1 chữ số lẻ). */
export function formatK(dong: number): string {
  const tenths = Math.round(dong / 100); // số phần mười của K
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  const whole = Math.floor(abs / 10);
  const frac = abs % 10;
  const wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${wholeStr}${frac ? ',' + frac : ''}K`;
}
