import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { Ingredient, StorageLocation, IngredientFilterState } from './types';
import { getDatabase } from '../../db/database';
import { calculateExpiryStatus, calculateDaysUntilExpiry, DEFAULT_THRESHOLDS, ExpiryThresholds } from '../../utils/expiryUtils';
import { useRecipeStore } from '../recipe/store';
import { scheduleAllNotifications } from '../../services/notifications/notificationService';
import { useUserStore } from '../user/store';
import { useBirdStore } from '../bird/store';
import { checkAndUnlockBirds } from '../../services/bird/unlockService';
import i18n from '../../i18n';

const EXPIRY_SORT_ORDER: Record<string, number> = {
  expired: 0,
  urgent: 1,
  warning: 2,
  fresh: 3,
};

export interface AddIngredientInput {
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string; // 'YYYY-MM-DD'
  imagePath?: string; // 本地图片 URI（可选）
  imageCrop?: { x: number; y: number; width: number; height: number }; // boundingBox（可选）
}

interface IngredientStore {
  ingredients: Ingredient[];
  loadIngredients: () => void;
  addIngredient: (input: AddIngredientInput) => void;
  updateIngredient: (
    id: string,
    updates: Partial<Pick<Ingredient, 'quantity' | 'remainingPercentage' | 'expiryDate' | 'filterState' | 'imagePath'>>,
  ) => void;
  deleteIngredient: (id: string) => void;
  setFilterState: (id: string, state: IngredientFilterState) => void;
  resetAllFilterStates: () => void;
}

export const useIngredientStore = create<IngredientStore>((set, get) => ({
  ingredients: [],

  loadIngredients: () => {
    const db = getDatabase();
    const rows = db.getAllSync<Ingredient & { imageCrop: string | null }>('SELECT * FROM ingredients');

    const { userPreference } = useUserStore.getState();
    const thresholds: ExpiryThresholds = userPreference
      ? {
          urgentDays: userPreference.urgentDays,
          urgentPercentage: userPreference.urgentPercentage,
          urgentAbsoluteDays: userPreference.urgentAbsoluteDays,
          warningDays: userPreference.warningDays,
          warningPercentage: userPreference.warningPercentage,
          warningAbsoluteDays: userPreference.warningAbsoluteDays,
        }
      : DEFAULT_THRESHOLDS;

    const ingredients = rows.map(row => {
      const days = calculateDaysUntilExpiry(row.expiryDate);
      const status = calculateExpiryStatus(days, row.remainingPercentage, thresholds);
      let imageCrop: Ingredient['imageCrop'] = null;
      try { if (row.imageCrop) imageCrop = JSON.parse(row.imageCrop); } catch (_) {}
      return { ...row, daysUntilExpiry: days, expiryStatus: status, imageCrop };
    });

    ingredients.sort((a, b) => {
      const diff = EXPIRY_SORT_ORDER[a.expiryStatus] - EXPIRY_SORT_ORDER[b.expiryStatus];
      return diff !== 0 ? diff : a.daysUntilExpiry - b.daysUntilExpiry;
    });

    set({ ingredients });

    // 异步验证绝对路径是否仍然有效（iOS 沙盒路径重启后可能变化）
    (async () => {
      for (const ing of ingredients) {
        if (!ing.imagePath) continue;
        const isAbsolute = ing.imagePath.startsWith('file://') || ing.imagePath.startsWith('/var/mobile') || ing.imagePath.startsWith('/private/var');
        if (!isAbsolute) continue;
        try {
          const info = await FileSystem.getInfoAsync(ing.imagePath);
          if (!info.exists) {
            db.runSync('UPDATE ingredients SET imagePath = NULL WHERE id = ?', [ing.id]);
          }
        } catch {
          db.runSync('UPDATE ingredients SET imagePath = NULL WHERE id = ?', [ing.id]);
        }
      }
      // 如果有路径失效，重新加载（不递归触发路径检查）
      const updated = db.getAllSync<Ingredient & { imageCrop: string | null }>('SELECT * FROM ingredients');
      const hasChange = updated.some((r, i) => r.imagePath !== ingredients[i]?.imagePath);
      if (hasChange) {
        const fixed = updated.map(row => {
          const days = calculateDaysUntilExpiry(row.expiryDate);
          const status = calculateExpiryStatus(days, row.remainingPercentage, thresholds);
          let imageCrop: Ingredient['imageCrop'] = null;
          try { if (row.imageCrop) imageCrop = JSON.parse(row.imageCrop); } catch (_) {}
          return { ...row, daysUntilExpiry: days, expiryStatus: status, imageCrop };
        });
        fixed.sort((a, b) => {
          const diff = EXPIRY_SORT_ORDER[a.expiryStatus] - EXPIRY_SORT_ORDER[b.expiryStatus];
          return diff !== 0 ? diff : a.daysUntilExpiry - b.daysUntilExpiry;
        });
        set({ ingredients: fixed });
      }
    })();
  },

  addIngredient: (input) => {
    const db = getDatabase();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const today = new Date().toISOString().split('T')[0];
    const days = calculateDaysUntilExpiry(input.expiryDate);
    const { userPreference: addPref } = useUserStore.getState();
    const addThresholds: ExpiryThresholds = addPref
      ? { urgentDays: addPref.urgentDays, urgentPercentage: addPref.urgentPercentage, urgentAbsoluteDays: addPref.urgentAbsoluteDays, warningDays: addPref.warningDays, warningPercentage: addPref.warningPercentage, warningAbsoluteDays: addPref.warningAbsoluteDays }
      : DEFAULT_THRESHOLDS;
    const status = calculateExpiryStatus(days, 100, addThresholds);

    db.runSync(
      `INSERT INTO ingredients
         (id, name, quantity, unit, expiryDate, loggedDate, daysUntilExpiry,
          imagePath, imageCrop, remainingPercentage, originalQuantity, storageLocation, expiryStatus, filterState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.quantity,
        input.unit,
        input.expiryDate,
        today,
        days,
        input.imagePath ?? null,
        input.imageCrop ? JSON.stringify(input.imageCrop) : null,
        100,
        input.quantity,
        StorageLocation.ROOM_TEMP,
        status,
        IngredientFilterState.NULL,
      ],
    );

    get().loadIngredients();
    useRecipeStore.getState().invalidateCache();
    const { ingredients } = get();
    const { userPreference, userEvent } = useUserStore.getState();
    if (userPreference) {
      scheduleAllNotifications(ingredients, userPreference, userEvent, i18n.language as 'zh' | 'en');
    }
    // 统计食材录入数并检测小鸟解锁
    useUserStore.getState().incrementIngredientsLogged();
    const updatedEvent = useUserStore.getState().userEvent;
    if (updatedEvent) {
      const unlocked = checkAndUnlockBirds(updatedEvent);
      unlocked.forEach(r => useBirdStore.getState().addPendingUnlock(r));
    }
  },

  updateIngredient: (id, updates) => {
    const db = getDatabase();
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];

    if (updates.quantity !== undefined) { sets.push('quantity = ?'); vals.push(updates.quantity); }
    if (updates.remainingPercentage !== undefined) { sets.push('remainingPercentage = ?'); vals.push(updates.remainingPercentage); }
    if (updates.expiryDate !== undefined) { sets.push('expiryDate = ?'); vals.push(updates.expiryDate); }
    if (updates.filterState !== undefined) { sets.push('filterState = ?'); vals.push(updates.filterState); }
    if (updates.imagePath !== undefined) { sets.push('imagePath = ?'); vals.push(updates.imagePath ?? null); }

    if (sets.length === 0) return;
    vals.push(id);
    db.runSync(`UPDATE ingredients SET ${sets.join(', ')} WHERE id = ?`, vals);
    get().loadIngredients();
    if (updates.quantity !== undefined) {
      useRecipeStore.getState().invalidateCache();
    }
    // 食材消耗完时检测小鸟解锁
    if (updates.remainingPercentage === 0) {
      const { userEvent } = useUserStore.getState();
      if (userEvent) {
        const unlocked = checkAndUnlockBirds(userEvent);
        unlocked.forEach(r => useBirdStore.getState().addPendingUnlock(r));
      }
    }
  },

  deleteIngredient: (id) => {
    const db = getDatabase();
    db.runSync('DELETE FROM ingredients WHERE id = ?', [id]);
    get().loadIngredients();
    useRecipeStore.getState().invalidateCache();
    const { ingredients } = get();
    const { userPreference, userEvent } = useUserStore.getState();
    if (userPreference) {
      scheduleAllNotifications(ingredients, userPreference, userEvent, i18n.language as 'zh' | 'en');
    }
  },

  setFilterState: (id, filterState) => {
    const db = getDatabase();
    db.runSync('UPDATE ingredients SET filterState = ? WHERE id = ?', [filterState, id]);
    get().loadIngredients();
  },

  resetAllFilterStates: () => {
    const db = getDatabase();
    db.runSync('UPDATE ingredients SET filterState = ?', [IngredientFilterState.NULL]);
    get().loadIngredients();
  },
}));
