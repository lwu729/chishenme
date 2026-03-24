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
  loadUserEvent: () => void;
  updateUserPreference: (updates: Partial<Omit<UserPreference, 'id'>>) => void;
  updateUserEvent: (updates: Partial<Pick<UserEvent,
    'hasFinishedWarningIngredient' |
    'hasFinishedUrgentIngredient' |
    'hasFinishedFreshIngredient' |
    'hasLetIngredientExpire'
  >>) => void;
  incrementIngredientsLogged: () => void;
  incrementMealsCooked: () => void;
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
    birdSelectionMode: (row.birdSelectionMode ?? 'manual') as 'manual' | 'auto',
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

function rowToEvent(row: any): UserEvent {
  return {
    id: 1,
    totalIngredientsLogged: row.totalIngredientsLogged ?? 0,
    totalMealsCooked: row.totalMealsCooked ?? 0,
    dailyMealsCooked: row.dailyMealsCooked ?? 0,
    dailyMealsCookedDate: row.dailyMealsCookedDate ?? '',
    cookingStreakDays: row.cookingStreakDays ?? 0,
    lastCookedDate: row.lastCookedDate ?? null,
    hasFinishedWarningIngredient: (row.hasFinishedWarningIngredient ?? 0) === 1,
    hasFinishedUrgentIngredient: (row.hasFinishedUrgentIngredient ?? 0) === 1,
    hasFinishedFreshIngredient: (row.hasFinishedFreshIngredient ?? 0) === 1,
    hasLetIngredientExpire: (row.hasLetIngredientExpire ?? 0) === 1,
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

  loadUserEvent: () => {
    const db = getDatabase();
    const row = db.getFirstSync<any>('SELECT * FROM user_events WHERE id = 1');
    if (!row) return;
    set({ userEvent: rowToEvent(row) });
  },

  updateUserEvent: (updates) => {
    const db = getDatabase();
    const setClauses = Object.keys(updates).map(k => `${k} = ?`);
    const values = [...Object.values(updates).map(v => (v ? 1 : 0)), 1];
    db.runSync(`UPDATE user_events SET ${setClauses.join(', ')} WHERE id = 1`, values);
    const row = db.getFirstSync<any>('SELECT * FROM user_events WHERE id = 1');
    if (row) set({ userEvent: rowToEvent(row) });
  },

  incrementIngredientsLogged: () => {
    const db = getDatabase();
    db.runSync(
      'UPDATE user_events SET totalIngredientsLogged = totalIngredientsLogged + 1 WHERE id = 1',
    );
    const row = db.getFirstSync<any>('SELECT * FROM user_events WHERE id = 1');
    if (row) set({ userEvent: rowToEvent(row) });
  },

  incrementMealsCooked: () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const row = db.getFirstSync<any>('SELECT * FROM user_events WHERE id = 1');
    if (!row) return;

    const lastDate: string = row.dailyMealsCookedDate ?? '';
    const lastCooked: string | null = row.lastCookedDate ?? null;
    const prevStreak: number = row.cookingStreakDays ?? 0;

    // Update daily count
    const newDailyCount = lastDate === today ? (row.dailyMealsCooked ?? 0) + 1 : 1;

    // Update streak
    let newStreak = prevStreak;
    if (lastCooked) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (lastCooked === yesterdayStr) {
        newStreak = prevStreak + 1;
      } else if (lastCooked !== today) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    db.runSync(
      `UPDATE user_events SET
        totalMealsCooked = totalMealsCooked + 1,
        dailyMealsCooked = ?,
        dailyMealsCookedDate = ?,
        cookingStreakDays = ?,
        lastCookedDate = ?
       WHERE id = 1`,
      [newDailyCount, today, newStreak, today],
    );
    const updated = db.getFirstSync<any>('SELECT * FROM user_events WHERE id = 1');
    if (updated) set({ userEvent: rowToEvent(updated) });
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
    if ('birdSelectionMode' in updates) {
      setClauses.push('birdSelectionMode = ?');
      values.push(updates.birdSelectionMode as string);
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
