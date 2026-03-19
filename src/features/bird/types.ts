// ============ BIRD COMPANION ============
export enum BirdUnlockTriggerType {
  TOTAL_INGREDIENTS_LOGGED = 'total_ingredients_logged',
  TOTAL_MEALS_COOKED = 'total_meals_cooked',
  DAILY_MEALS_COUNT = 'daily_meals_count',
  STREAK_DAYS = 'streak_days',
  BOOLEAN_STATUS = 'boolean_status', // 触发某个 UserEvent boolean 状态
}

export interface BirdCompanion {
  id: string;
  name: string;
  unlockTriggerType: BirdUnlockTriggerType;
  unlockTriggerValue: number | string; // number 类型用于计数触发，string 用于 BOOLEAN_STATUS
  personalityDescription: string; // 传给 AI 的风格描述，如「傲娇、喜欢用反问句」
  isUnlocked: boolean;
  unlockedAt: string | null;
  imagePath: string; // 本地静态资源路径
}

