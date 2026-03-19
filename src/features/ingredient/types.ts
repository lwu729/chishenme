// ============ EXPIRY ============
// 判断顺序严格按照：已过期 → 即将过期 → 快过期 → 新鲜
export enum ExpiryStatus {
  EXPIRED = 'expired', // 过期日已过
  URGENT = 'urgent', // 剩余天数 ≤ 3 且 还需要吃 ≥ 50%，OR 剩余天数 ≤ 1
  WARNING = 'warning', // 剩余天数 ≤ 5 且 还需要吃 ≥ 75%，OR 剩余天数 ≤ 3
  FRESH = 'fresh', // 其余所有情况
}

export enum StorageLocation {
  REFRIGERATED = 'refrigerated', // 冷藏
  FROZEN = 'frozen', // 冷冻
  ROOM_TEMP = 'room_temp', // 常温
}

export enum IngredientFilterState {
  NULL = 'null', // 默认状态
  INCLUDE = 'include', // 菜谱生成时优先包括
  EXCLUDE = 'exclude', // 菜谱生成时排除
}

// ============ INGREDIENT ============
export interface Ingredient {
  id: string; // UUID
  name: string;
  quantity: number; // decimal，一位小数点
  unit: string; // any string: 克/个/ml/一把 等
  expiryDate: string; // ISO date string
  loggedDate: string; // ISO date string，录入日
  daysUntilExpiry: number; // 计算得出：expiryDate - today
  imagePath: string | null;
  remainingPercentage: number; // 还需要消耗的百分比（100 = 全新，0 = 用完）
  storageLocation: StorageLocation;
  expiryStatus: ExpiryStatus; // 计算得出
  filterState: IngredientFilterState; // 用于菜谱生成
}

