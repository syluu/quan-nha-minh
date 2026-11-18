import type { SimEvent } from '@qnm/shared';

export type Cue = 'pick' | 'drop' | 'trash' | 'cash' | 'unlock' | 'lost' | 'dayEnd' | 'monthEnd' | 'tip' | 'combo' | 'cheer' | 'meow' | 'bus' | 'clap';

/** Chọn âm thanh cần phát từ thay đổi số món đang cầm và các sự kiện vừa nhận. */
export function cuesFor(prevCarry: number, nextCarry: number, events: SimEvent[], myId: string): Cue[] {
  const cues: Cue[] = [];
  const myTrash = events.filter((e) => e.type === 'trash' && e.playerId === myId).length;
  if (nextCarry > prevCarry) cues.push('pick');
  else if (nextCarry < prevCarry && myTrash === 0) cues.push('drop');
  for (let i = 0; i < myTrash; i++) cues.push('trash');
  for (const e of events) {
    if (e.type === 'sale' || e.type === 'orderDone') {
      cues.push('cash');
      if (e.type === 'sale' && e.tip) cues.push('tip');
    } else if (e.type === 'combo') cues.push('combo');
    else if (e.type === 'questDone' || e.type === 'badge') cues.push('cheer');
    else if (e.type === 'catFed' || e.type === 'catStray') cues.push('meow');
    else if (e.type === 'tourBus') cues.push('bus');
    else if (e.type === 'highFive') cues.push('clap');
    else if (e.type === 'unlock') cues.push('unlock');
    else if (e.type === 'customerLost' || e.type === 'orderCancelled') cues.push('lost');
    else if (e.type === 'dayEnd') cues.push('dayEnd');
    else if (e.type === 'monthEnd') cues.push('monthEnd');
  }
  return cues;
}
