import { create } from 'zustand';
import { UserEvent, UserPreference } from './types';

interface UserStore {
  userEvent: UserEvent | null;
  userPreference: UserPreference | null;

  // TODO: loadUserEvent() — 从 SQLite 读取 id=1 的 user_events 行
  // TODO: loadUserPreference() — 从 SQLite 读取 id=1 的 user_preferences 行
  // TODO: updateUserEvent(updates: Partial<Omit<UserEvent, 'id'>>) — 更新事件计数
  // TODO: updateUserPreference(updates: Partial<Omit<UserPreference, 'id'>>) — 更新用户偏好
  // TODO: incrementMealsCooked() — 增加做饭计数，处理每日重置和 streak 逻辑
  // TODO: incrementIngredientsLogged(count: number) — 增加食材录入计数
  // TODO: checkAndResetDailyMeals() — 检查是否需要重置每日做饭计数（4:00am）
}

export const useUserStore = create<UserStore>(() => ({
  userEvent: null,
  userPreference: null,
}));

