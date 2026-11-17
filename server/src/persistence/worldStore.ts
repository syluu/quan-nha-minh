import type { WorldState } from '@qnm/shared';

export interface WorldStore {
  create(world: WorldState): Promise<void>;
  /** Trả dữ liệu thô (chưa chuẩn hoá) hoặc null nếu không có. */
  load(code: string): Promise<unknown | null>;
  save(world: WorldState): Promise<void>;
  exists(code: string): Promise<boolean>;
}
