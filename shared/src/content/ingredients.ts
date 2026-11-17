import { K } from '../money';
import type { IngredientDef, IngredientId } from './ids';

export const INGREDIENTS: Record<IngredientId, IngredientDef> = {
  bot_mi: { id: 'bot_mi', name: 'Bột mì', marketPrice: K(2) },
  trung: { id: 'trung', name: 'Trứng', marketPrice: K(3) },
  thit_lon: { id: 'thit_lon', name: 'Thịt lợn', marketPrice: K(6) },
  rau: { id: 'rau', name: 'Rau', marketPrice: K(1) },
  tra: { id: 'tra', name: 'Trà', marketPrice: K(0.5) },
};
