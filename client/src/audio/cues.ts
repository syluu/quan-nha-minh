import type { SimEvent } from '@qnm/shared';

export type Cue = 'pick' | 'drop' | 'trash' | 'cash' | 'unlock' | 'lost' | 'dayEnd' | 'monthEnd';

/** Chọn âm thanh cần phát từ thay đổi số món đang cầm và các sự kiện vừa nhận. */
export function cuesFor(prevCarry: number, nextCarry: number, events: SimEvent[], myId: string): Cue[] {
  const cues: Cue[] = [];
  const myTrash = events.filter((e) => e.type === 'trash' && e.playerId === myId).length;
  if (nextCarry > prevCarry) cues.push('pick');
  else if (nextCarry < prevCarry && myTrash === 0) cues.push('drop');
  for (let i = 0; i < myTrash; i++) cues.push('trash');
  for (const e of events) {
    if (e.type === 'sale' || e.type === 'orderDone') cues.push('cash');
    else if (e.type === 'unlock') cues.push('unlock');
    else if (e.type === 'customerLost' || e.type === 'orderCancelled') cues.push('lost');
    else if (e.type === 'dayEnd') cues.push('dayEnd');
    else if (e.type === 'monthEnd') cues.push('monthEnd');
  }
  return cues;
}
