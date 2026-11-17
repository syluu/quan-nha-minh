import { K } from '../money';
import type { IngredientDef, IngredientId } from './ids';

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  bot_mi: { id: 'bot_mi', name: 'Bột mì', marketPrice: K(2) },
  trung: { id: 'trung', name: 'Trứng', marketPrice: K(3) },
  thit_lon: { id: 'thit_lon', name: 'Thịt lợn', marketPrice: K(6) },
  rau: { id: 'rau', name: 'Rau', marketPrice: K(1) },
  tra: { id: 'tra', name: 'Trà', marketPrice: K(0.5) },
  gao: { id: 'gao', name: 'Gạo', marketPrice: K(3) },
  xuong_bo: { id: 'xuong_bo', name: 'Xương bò', marketPrice: K(8) },
  thit_bo: { id: 'thit_bo', name: 'Thịt bò', marketPrice: K(15) },
  ca_phe: { id: 'ca_phe', name: 'Cà phê', marketPrice: K(4) },
  sua_dac: { id: 'sua_dac', name: 'Sữa đặc', marketPrice: K(2) },
};
