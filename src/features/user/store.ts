import { create } from 'zustand';
import { UserEvent, UserPreference } from './types';
import { getDatabase } from '../../db/database';
import { useIngredientStore } from '../ingredient/store';
import { scheduleAllNotifications } from '../../services/notifications/notificationService';
import i18n from '../../i18n';

interface UserStore {
  userEvent: UserEvent | null;
  userPreference: UserPreference | null;

  loadUserPreference: () => void;
  updateUserPreference: (updates: Partial<Omit<UserPreference, 'id'>>) => void;
  // TODO: loadUserEvent() — 从 SQLite 读取 id=1 的 user_events 行
  // TODO: updateUserEvent(updates: Partial<Omit<UserEvent, 'id'>>) — 更新事件计数
  // TODO: incrementMealsCooked() — 增加做饭计数，处理每日重置和 streak 逻辑
  // TODO: incrementIngredientsLogged(count: number) — 增加食材录入计数
  // TODO: checkAndResetDailyMeals() — 检查是否需要重置每日做饭计数（4:00am）
}

function rowToPreference(row: any): UserPreference {
  return {
    id: 1,
    cookingTools: JSON.parse(row.cookingTools ?? '[]'),
    cookingAppliances: JSON.parse(row.cookingAppliances ?? '[]'),
    knives: JSON.parse(row.knives ?? '[]'),
    assistiveTools: JSON.parse(row.assistiveTools ?? '[]'),
    measuringTools: JSON.parse(row.measuringTools ?? '[]'),
    condiments: JSON.parse(row.condiments ?? '[]'),
    useImperialUnits: row.useImperialUnits === 1,
    preferredCuisines: JSON.parse(row.preferredCuisines ?? '[]'),
    preferredCookingMethods: JSON.parse(row.preferredCookingMethods ?? '[]'),
    preferredFlavors: JSON.parse(row.preferredFlavors ?? '[]'),
    activeBirdId: row.activeBirdId ?? null,
    notificationsEnabled: (row.notificationsEnabled ?? 1) === 1,
    notifyOnStatusChange: (row.notifyOnStatusChange ?? 1) === 1,
    notifyOnExpired: (row.notifyOnExpired ?? 1) === 1,
    notifyOnUrgent: (row.notifyOnUrgent ?? 1) === 1,
    notifyOnWarning: (row.notifyOnWarning ?? 1) === 1,
    notifyInactiveIngredientDays: row.notifyInactiveIngredientDays ?? 7,
    notifyInactiveRecipeDays: row.notifyInactiveRecipeDays ?? 3,
    notifyTimeStatusChange: row.notifyTimeStatusChange ?? '09:00',
    notifyTimeExpired: row.notifyTimeExpired ?? '09:00',
    notifyTimeDailyReminder: row.notifyTimeDailyReminder ?? '09:00',
    notifyTimeInactive: row.notifyTimeInactive ?? '09:00',
    urgentDays: row.urgentDays ?? 3,
    urgentPercentage: row.urgentPercentage ?? 50,
    urgentAbsoluteDays: row.urgentAbsoluteDays ?? 1,
    warningDays: row.warningDays ?? 5,
    warningPercentage: row.warningPercentage ?? 75,
    warningAbsoluteDays: row.warningAbsoluteDays ?? 3,
  };
}

export const useUserStore = create<UserStore>((set, get) => ({
  userEvent: null,
  userPreference: null,

  loadUserPreference: () => {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM user_preferences WHERE id = 1');
    if (!row) return;
    set({ userPreference: rowToPreference(row) });
  },

  updateUserPreference: (updates) => {
    const db = getDatabase();
    const setClauses: string[] = [];
    const values: any[] = [];

    const jsonFields: (keyof typeof updates)[] = [
      'cookingTools', 'cookingAppliances', 'knives', 'assistiveTools',
      'measuringTools', 'condiments', 'preferredCuisines',
      'preferredCookingMethods', 'preferredFlavors',
    ];
    for (const field of jsonFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(JSON.stringify(updates[field]));
      }
    }
    if ('useImperialUnits' in updates) {
      setClauses.push('useImperialUnits = ?');
      values.push(updates.useImperialUnits ? 1 : 0);
    }
    if ('activeBirdId' in updates) {
      setClauses.push('activeBirdId = ?');
      values.push(updates.activeBirdId ?? null);
    }

    const boolNotifFields: (keyof typeof updates)[] = [
      'notificationsEnabled', 'notifyOnStatusChange', 'notifyOnExpired',
      'notifyOnUrgent', 'notifyOnWarning',
    ];
    for (const field of boolNotifFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field] ? 1 : 0);
      }
    }

    const intNotifFields: (keyof typeof updates)[] = [
      'notifyInactiveIngredientDays', 'notifyInactiveRecipeDays',
    ];
    for (const field of intNotifFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field] as number);
      }
    }

    const strNotifFields: (keyof typeof updates)[] = [
      'notifyTimeStatusChange', 'notifyTimeExpired',
      'notifyTimeDailyReminder', 'notifyTimeInactive',
    ];
    for (const field of strNotifFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field] as string);
      }
    }

    const thresholdFields: (keyof typeof updates)[] = [
      'urgentDays', 'urgentPercentage', 'urgentAbsoluteDays',
      'warningDays', 'warningPercentage', 'warningAbsoluteDays',
    ];
    for (const field of thresholdFields) {
      if (field in updates) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field] as number);
      }
    }

    if (setClauses.length === 0) return;

    values.push(1); // WHERE id = 1
    db.runSync(
      `UPDATE user_preferences SET ${setClauses.join(', ')} WHERE id = ?`,
      values,
    );

    const row = db.getFirstSync<any>('SELECT * FROM user_preferences WHERE id = 1');
    if (row) set({ userPreference: rowToPreference(row) });

    // 如有阈值变化，重新计算所有食材过期状态，并重排通知
    const hasThresholdChange = thresholdFields.some(f => f in updates);
    if (hasThresholdChange) {
      useIngredientStore.getState().loadIngredients();
      const { ingredients } = useIngredientStore.getState();
      const updatedPref = get().userPreference;
      const currentEvent = get().userEvent;
      if (updatedPref) {
        scheduleAllNotifications(ingredients, updatedPref, currentEvent, i18n.language as 'zh' | 'en');
      }
    }
  },
}));
