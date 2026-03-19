import { create } from 'zustand';
import { BirdCompanion } from './types';

interface BirdStore {
  birds: BirdCompanion[];
  activeBird: BirdCompanion | null;

  // TODO: loadBirds() — 从 SQLite 读取所有小鸟伙伴
  // TODO: unlockBird(id: string) — 解锁指定小鸟
  // TODO: setActiveBird(id: string) — 设置当前激活小鸟（同步到 userPreference）
  // TODO: checkUnlockConditions(userEvent: UserEvent) — 检查并触发解锁条件
}

export const useBirdStore = create<BirdStore>(() => ({
  birds: [],
  activeBird: null,
}));

