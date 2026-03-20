// ============ USER EVENT ============
// 单行记录，不断更新
export interface UserEvent {
  id: 1; // 永远只有一行
  totalIngredientsLogged: number;
  totalMealsCooked: number;
  dailyMealsCooked: number; // 每天 4:00am 重置
  dailyMealsCookedDate: string; // 记录 dailyMealsCooked 对应的日期，用于判断是否需要重置
  cookingStreakDays: number; // 连续做饭天数
  lastCookedDate: string | null; // 上次做饭的日期，用于 streak 计算
  // Boolean 状态，一旦触发永久不变
  hasFinishedWarningIngredient: boolean;
  hasFinishedUrgentIngredient: boolean;
  hasFinishedFreshIngredient: boolean;
  hasLetIngredientExpire: boolean;
}

// ============ USER PREFERENCE ============
export interface UserPreference {
  id: 1;
  cookingTools: string[]; // 烹饪器具，如 ['电饭煲', '炒锅']
  knives: string[]; // 刀具
  assistiveTools: string[]; // 辅助器具
  measuringTools: string[]; // 测量工具，如 ['厨房秤', '量杯']
  condiments: string[]; // 调料，如 ['酱油', '盐', '糖']
  // 菜谱生成偏好（作为 AI prompt 的默认条件）
  preferredCuisines: string[];
  preferredCookingMethods: string[];
  preferredFlavors: string[];
  activeBirdId: string | null; // 当前激活的小鸟伙伴 id
}

