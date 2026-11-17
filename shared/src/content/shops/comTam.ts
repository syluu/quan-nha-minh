import { K } from '../../money';
import type { ShopLayout } from '../stations';
import { DINING_FRAME, DINING_TABLES, TRASH, kitchen, pickupPoint, shelf } from './frame';

/** Quán cơm tấm: đông buổi trưa và tối. */
export const COM_TAM_SHOP: ShopLayout = {
  id: 'com_tam',
  name: 'Quán cơm tấm',
  ...DINING_FRAME,
  baseCustomerIntervalSec: 5,
  hourCurve: [
    [6, 10, 0.6],
    [10, 11, 1.0],
    [11, 13, 2.0],
    [13, 17, 0.6],
    [17, 20, 1.5],
    [20, 22, 0.6],
  ],
  stations: [
    { instanceId: 'noi_com', def: 'noi_com', ...kitchen(-6.25), unlockCost: 0, requires: [] },
    { instanceId: 'lo_suon', def: 'lo_suon', ...kitchen(-3.75), unlockCost: 0, requires: [] },
    { instanceId: 'ban_com_tam_suon', def: 'ban_com_tam_suon', ...kitchen(-1.25), unlockCost: 0, requires: [] },
    { instanceId: 'ke_com_tam_suon', def: 'ke_com_tam_suon', ...shelf(-1.25), unlockCost: 0, requires: [] },
    { instanceId: 'thu_ngan', def: 'thu_ngan', ...shelf(6.25), unlockCost: 0, requires: [] },
    TRASH,

    { instanceId: 'chao_cha', def: 'chao_cha', ...kitchen(1.25), unlockCost: K(1500), requires: ['ke_com_tam_suon'] },
    { instanceId: 'ban_com_tam_suon_cha', def: 'ban_com_tam_suon_cha', ...kitchen(3.75), unlockCost: K(2500), requires: ['chao_cha'] },
    { instanceId: 'ke_com_tam_suon_cha', def: 'ke_com_tam_suon_cha', ...shelf(3.75), unlockCost: K(500), requires: ['ban_com_tam_suon_cha'] },

    { instanceId: 'binh_tra', def: 'binh_tra', ...kitchen(6.25), unlockCost: K(300), requires: ['ke_com_tam_suon'] },
    { instanceId: 'ke_tra_da', def: 'ke_tra_da', ...shelf(1.25), unlockCost: K(200), requires: ['binh_tra'] },

    pickupPoint('ke_com_tam_suon'),
    ...DINING_TABLES,
  ],
};
