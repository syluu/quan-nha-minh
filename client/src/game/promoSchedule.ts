import { formatClock } from '@qnm/shared';

/** Một lượt khách mời (KOL, người review) ghé quán trong ngày: đi vào → làm việc → ra về (giây trong ngày game). */
export interface VisitWindow {
  enter: number;
  start: number;
  end: number;
  leave: number;
}

/** KOL tới sớm (khoảng 06:40), quay video gần hết buổi sáng–trưa rồi về. */
export const KOL_VISIT: VisitWindow = { enter: 15, start: 35, end: 200, leave: 225 };
/** Người review / phóng viên tới giờ trưa, ngồi ăn thử rồi về. */
export const REVIEW_VISIT: VisitWindow = { enter: 60, start: 80, end: 250, leave: 275 };

export type VisitPhase = { state: 'enter' | 'work' | 'leave'; k: number } | null;

/** Đang ở đâu trong lượt ghé: k = tiến độ 0..1 của đoạn đi vào / ra về. */
export function visitPhase(w: VisitWindow, secOfDay: number): VisitPhase {
  if (secOfDay < w.enter || secOfDay >= w.leave) return null;
  if (secOfDay < w.start) return { state: 'enter', k: (secOfDay - w.enter) / (w.start - w.enter) };
  if (secOfDay < w.end) return { state: 'work', k: 0 };
  return { state: 'leave', k: (secOfDay - w.end) / (w.leave - w.end) };
}

/** Giờ ra về (để ghi trên thông báo). */
export function visitUntil(w: VisitWindow): string {
  return formatClock(w.end);
}
