import { create } from 'zustand';
import { UserEvent, UserPreference } from './types';
import { getDatabase } from '../../db/database';

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
  };
}

export const useUserStore = create<UserStore>((set) => ({
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
    if (setClauses.length === 0) return;

    values.push(1); // WHERE id = 1
    db.runSync(
      `UPDATE user_preferences SET ${setClauses.join(', ')} WHERE id = ?`,
      values,
    );

    const row = db.getFirstSync<any>('SELECT * FROM user_preferences WHERE id = 1');
    if (row) set({ userPreference: rowToPreference(row) });
  },
}));
