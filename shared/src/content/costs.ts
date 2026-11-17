import { INGREDIENTS } from './ingredients';
import type { ItemId } from './ids';
import { STATIONS } from './stations';

/** Giá trị nguyên liệu (đồng) để làm ra 1 món, cộng dồn theo công thức. */
export function itemCost(item: ItemId): number {
  for (const def of Object.values(STATIONS)) {
    if ((def.kind === 'producer' || def.kind === 'assembler') && def.output === item) {
      const ing = def.ingredients.reduce((s, i) => s + INGREDIENTS[i.id].marketPrice * i.qty, 0);
      const inputs = def.kind === 'assembler' ? def.inputs.reduce((s, i) => s + itemCost(i.item) * i.qty, 0) : 0;
      return ing + inputs;
    }
  }
  return 0;
}
