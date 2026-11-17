import { K } from '../../money';
import type { ShopLayout } from '../stations';
import { DINING_FRAME, DINING_TABLES, TRASH, kitchen, pickupPoint, shelf } from './frame';

/** Quán phở & cà phê: phở đông buổi sáng, cà phê buổi chiều. */
export const PHO_CAFE_SHOP: ShopLayout = {
  id: 'pho_cafe',
  name: 'Quán phở & cà phê',
  ...DINING_FRAME,
  baseCustomerIntervalSec: 5,
  hourCurve: [
    [6, 9, 2.0],
    [9, 11, 1.0],
    [11, 13, 1.0],
    [13, 17, 1.3],
    [17, 20, 0.9],
    [20, 22, 0.5],
  ],
  stations: [
    { instanceId: 'noi_nuoc_dung', def: 'noi_nuoc_dung', ...kitchen(-6.25), unlockCost: 0, requires: [] },
    { instanceId: 'may_banh_pho', def: 'may_banh_pho', ...kitchen(-3.75), unlockCost: 0, requires: [] },
    { instanceId: 'thot_bo', def: 'thot_bo', ...kitchen(-1.25), unlockCost: 0, requires: [] },
    { instanceId: 'ban_pho', def: 'ban_pho', ...kitchen(1.25), unlockCost: 0, requires: [] },
    { instanceId: 'ke_pho', def: 'ke_pho', ...shelf(1.25), unlockCost: 0, requires: [] },
    { instanceId: 'thu_ngan', def: 'thu_ngan', ...shelf(6.25), unlockCost: 0, requires: [] },
    TRASH,

    { instanceId: 'may_pha_phin', def: 'may_pha_phin', ...kitchen(3.75), unlockCost: K(1500), requires: ['ke_pho'] },
    { instanceId: 'ke_ca_phe_den', def: 'ke_ca_phe_den', ...shelf(-1.25), unlockCost: K(400), requires: ['may_pha_phin'] },
    { instanceId: 'quay_ca_phe', def: 'quay_ca_phe', ...kitchen(6.25), unlockCost: K(2000), requires: ['ke_ca_phe_den'] },
    { instanceId: 'ke_ca_phe_sua', def: 'ke_ca_phe_sua', ...shelf(3.75), unlockCost: K(400), requires: ['quay_ca_phe'] },

    pickupPoint('ke_pho'),
    ...DINING_TABLES,
  ],
};
