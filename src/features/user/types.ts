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
  cookingTools: string[]; // 烹饪器具（旧字段，保留兼容）
  cookingAppliances: string[]; // 烹饪器具，如 ['电饭煲', '炒锅']
  knives: string[]; // 刀具
  assistiveTools: string[]; // 辅助器具
  measuringTools: string[]; // 测量工具，如 ['厨房秤', '量杯']
  condiments: string[]; // 调料，如 ['酱油', '盐', '糖']
  useImperialUnits: boolean; // true = 英制（oz/lb/cups），false = 公制（g/ml）
  // 菜谱生成偏好（作为 AI prompt 的默认条件）
  preferredCuisines: string[];
  preferredCookingMethods: string[];
  preferredFlavors: string[];
  activeBirdId: string | null; // 当前激活的小鸟伙伴 id
  birdSelectionMode: 'manual' | 'auto'; // 手动选择 or 每天随机，默认 'manual'

  // 通知设置
  notificationsEnabled: boolean;        // 总开关，默认 true
  notifyOnStatusChange: boolean;        // 食材状态变化时通知，默认 true
  notifyOnExpired: boolean;             // 食材到期时通知，默认 true
  notifyOnUrgent: boolean;              // 即将过期每日提醒，默认 true
  notifyOnWarning: boolean;             // 快过期每日提醒，默认 true
  notifyInactiveIngredientDays: number; // x天没有录入食材提醒，默认 7，0 = 关闭
  notifyInactiveRecipeDays: number;     // x天没有生成菜谱提醒，默认 3，0 = 关闭

  // 通知时间（24小时制，存为 "HH:MM" 字符串）
  notifyTimeStatusChange: string;       // 默认 "09:00"
  notifyTimeExpired: string;            // 默认 "09:00"
  notifyTimeDailyReminder: string;      // 即将过期/快过期的每日提醒时间，默认 "09:00"
  notifyTimeInactive: string;           // 不活跃提醒时间，默认 "09:00"

  // 自定义菜谱标签（中英文分开存）
  customCuisinesZh: string[];
  customCuisinesEn: string[];
  customMethodsZh: string[];
  customMethodsEn: string[];
  customFlavorsZh: string[];
  customFlavorsEn: string[];

  // 过期状态阈值（对应 calculateExpiryStatus 的判定条件）
  urgentDays: number;           // 即将过期：剩余天数阈值，默认 3
  urgentPercentage: number;     // 即将过期：还需要吃的百分比阈值，默认 50
  urgentAbsoluteDays: number;   // 即将过期：无条件判定天数，默认 1
  warningDays: number;          // 快过期：剩余天数阈值，默认 5
  warningPercentage: number;    // 快过期：还需要吃的百分比阈值，默认 75
  warningAbsoluteDays: number;  // 快过期：无条件判定天数，默认 3
}

