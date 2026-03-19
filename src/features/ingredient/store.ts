import { create } from 'zustand';
import { Ingredient, StorageLocation, IngredientFilterState } from './types';
import { getDatabase } from '../../db/database';
import { calculateExpiryStatus, calculateDaysUntilExpiry } from '../../utils/expiryUtils';

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
}

interface IngredientStore {
  ingredients: Ingredient[];
  loadIngredients: () => void;
  addIngredient: (input: AddIngredientInput) => void;
  updateIngredient: (
    id: string,
    updates: Partial<Pick<Ingredient, 'quantity' | 'remainingPercentage' | 'expiryDate' | 'filterState'>>,
  ) => void;
  deleteIngredient: (id: string) => void;
  setFilterState: (id: string, state: IngredientFilterState) => void;
  resetAllFilterStates: () => void;
}

export const useIngredientStore = create<IngredientStore>((set, get) => ({
  ingredients: [],

  loadIngredients: () => {
    const db = getDatabase();
    const rows = db.getAllSync<Ingredient>('SELECT * FROM ingredients');

    const ingredients = rows.map(row => {
      const days = calculateDaysUntilExpiry(row.expiryDate);
      const status = calculateExpiryStatus(days, row.remainingPercentage);
      return { ...row, daysUntilExpiry: days, expiryStatus: status };
    });

    ingredients.sort((a, b) => {
      const diff = EXPIRY_SORT_ORDER[a.expiryStatus] - EXPIRY_SORT_ORDER[b.expiryStatus];
      return diff !== 0 ? diff : a.daysUntilExpiry - b.daysUntilExpiry;
    });

    set({ ingredients });
  },

  addIngredient: (input) => {
    const db = getDatabase();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const today = new Date().toISOString().split('T')[0];
    const days = calculateDaysUntilExpiry(input.expiryDate);
    const status = calculateExpiryStatus(days, 100);

    db.runSync(
      `INSERT INTO ingredients
         (id, name, quantity, unit, expiryDate, loggedDate, daysUntilExpiry,
          imagePath, remainingPercentage, storageLocation, expiryStatus, filterState)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.quantity,
        input.unit,
        input.expiryDate,
        today,
        days,
        null,
        100,
        StorageLocation.ROOM_TEMP,
        status,
        IngredientFilterState.NULL,
      ],
    );

    get().loadIngredients();
  },

  updateIngredient: (id, updates) => {
    const db = getDatabase();
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];

    if (updates.quantity !== undefined) { sets.push('quantity = ?'); vals.push(updates.quantity); }
    if (updates.remainingPercentage !== undefined) { sets.push('remainingPercentage = ?'); vals.push(updates.remainingPercentage); }
    if (updates.expiryDate !== undefined) { sets.push('expiryDate = ?'); vals.push(updates.expiryDate); }
    if (updates.filterState !== undefined) { sets.push('filterState = ?'); vals.push(updates.filterState); }

    if (sets.length === 0) return;
    vals.push(id);
    db.runSync(`UPDATE ingredients SET ${sets.join(', ')} WHERE id = ?`, vals);
    get().loadIngredients();
  },

  deleteIngredient: (id) => {
    const db = getDatabase();
    db.runSync('DELETE FROM ingredients WHERE id = ?', [id]);
    get().loadIngredients();
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
