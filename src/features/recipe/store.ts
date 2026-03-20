import { create } from 'zustand';
import { Recipe, RecipeSortOrder } from './types';
import { RecipeGenerationContext, generateRecipes } from '../../services/ai/recipeGenerate';
import { getDatabase } from '../../db/database';

const MAX_FAVORITED_RECIPES = 10;

/** 某次成功生成菜谱时的条件快照（仅内存，不持久化） */
export interface GenerationSnapshot {
  createdAt: string; // ISO
  ingredientIds: string[];
  ingredientQuantities: Record<string, number>;
  selectedCuisines: string[];
  selectedCookingMethods: string[];
  selectedFlavors: string[];
  excludedIngredientIds: string[];
  includedIngredientIds: string[];
}

function buildSnapshotFromContext(ctx: RecipeGenerationContext): GenerationSnapshot {
  const ingredientIds = [...ctx.availableIngredients.map(i => i.id)].sort();
  const ingredientQuantities: Record<string, number> = {};
  ctx.availableIngredients.forEach(i => {
    ingredientQuantities[i.id] = i.quantity;
  });
  return {
    createdAt: new Date().toISOString(),
    ingredientIds,
    ingredientQuantities,
    selectedCuisines: [...ctx.selectedCuisines].sort(),
    selectedCookingMethods: [...ctx.selectedCookingMethods].sort(),
    selectedFlavors: [...ctx.selectedFlavors].sort(),
    excludedIngredientIds: [...ctx.excludedIngredientIds].sort(),
    includedIngredientIds: [...ctx.includedIngredientIds].sort(),
  };
}

function sortedStringArrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

interface RecipeStore {
  currentRecipes: Recipe[];
  favoritedRecipes: Recipe[];
  isLoading: boolean;
  sortOrder: RecipeSortOrder;
  selectedCuisines: string[];
  selectedCookingMethods: string[];
  selectedFlavors: string[];
  lastGenerationSnapshot: GenerationSnapshot | null;

  loadFavoritedRecipes: () => void;
  generateAndSetRecipes: (context: RecipeGenerationContext) => Promise<void>;
  invalidateCache: () => void;
  toggleFavorite: (id: string) => void;
  setSortOrder: (order: RecipeSortOrder) => void;
  setSelectedCuisines: (cuisines: string[]) => void;
  setSelectedCookingMethods: (methods: string[]) => void;
  setSelectedFlavors: (flavors: string[]) => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  currentRecipes: [],
  favoritedRecipes: [],
  isLoading: false,
  sortOrder: RecipeSortOrder.MOST_URGENT,
  selectedCuisines: [],
  selectedCookingMethods: [],
  selectedFlavors: [],
  lastGenerationSnapshot: null,

  loadFavoritedRecipes: () => {
    const db = getDatabase();
    const rows = db.getAllSync<any>('SELECT * FROM recipes WHERE isFavorited = 1');
    const recipes: Recipe[] = rows.map(row => ({
      ...row,
      isFavorited: true,
      ingredients: JSON.parse(row.ingredients ?? '[]'),
      steps: JSON.parse(row.steps ?? '[]'),
    }));
    set({ favoritedRecipes: recipes });
  },

  generateAndSetRecipes: async (context) => {
    set({ isLoading: true });
    try {
      const recipes = await generateRecipes(context);
      // 标记已收藏的菜谱（按名称匹配，因为 currentRecipes 每次 id 都是新生成的）
      const { favoritedRecipes } = get();
      const favNames = new Set(favoritedRecipes.map(r => r.name));
      const marked = recipes.map(r => ({ ...r, isFavorited: favNames.has(r.name) }));
      set({
        currentRecipes: marked,
        isLoading: false,
        lastGenerationSnapshot: buildSnapshotFromContext(context),
      });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  invalidateCache: () => set({ lastGenerationSnapshot: null }),

  toggleFavorite: (id) => {
    const { currentRecipes, favoritedRecipes } = get();
    const db = getDatabase();
    const isFav = favoritedRecipes.some(r => r.id === id);

    if (isFav) {
      // 取消收藏
      db.runSync('UPDATE recipes SET isFavorited = 0 WHERE id = ?', [id]);
      const newFav = favoritedRecipes.filter(r => r.id !== id);
      const newCurrent = currentRecipes.map(r =>
        r.id === id ? { ...r, isFavorited: false } : r,
      );
      set({ favoritedRecipes: newFav, currentRecipes: newCurrent });
    } else {
      // 加入收藏
      if (favoritedRecipes.length >= MAX_FAVORITED_RECIPES) {
        throw new Error('收藏已满，最多收藏 10 个菜谱');
      }
      const recipe =
        currentRecipes.find(r => r.id === id) ?? favoritedRecipes.find(r => r.id === id);
      if (!recipe) return;

      const favRecipe = { ...recipe, isFavorited: true };
      db.runSync(
        `INSERT OR REPLACE INTO recipes
           (id, name, ingredients, durationMinutes, cuisine, cookingMethod,
            flavor, totalSteps, steps, isFavorited, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          favRecipe.id,
          favRecipe.name,
          JSON.stringify(favRecipe.ingredients),
          favRecipe.durationMinutes,
          favRecipe.cuisine,
          favRecipe.cookingMethod,
          favRecipe.flavor,
          favRecipe.totalSteps,
          JSON.stringify(favRecipe.steps),
          favRecipe.createdAt,
        ],
      );

      const newCurrent = currentRecipes.map(r => (r.id === id ? favRecipe : r));
      set({ favoritedRecipes: [...favoritedRecipes, favRecipe], currentRecipes: newCurrent });
    }
  },

  setSortOrder: (order) => set({ sortOrder: order }),
  setSelectedCuisines: (cuisines) => set({ selectedCuisines: cuisines }),
  setSelectedCookingMethods: (methods) => set({ selectedCookingMethods: methods }),
  setSelectedFlavors: (flavors) => set({ selectedFlavors: flavors }),
}));

/**
 * 当前 context 是否与上次成功生成时的快照不同（需重新生成）。
 * snapshot 为 null 视为从未生成过 → true。
 */
export function hasConditionsChanged(context: RecipeGenerationContext): boolean {
  const snap = useRecipeStore.getState().lastGenerationSnapshot;
  if (!snap) return true;

  const currentIds = [...context.availableIngredients.map(i => i.id)].sort();
  if (!sortedStringArrayEqual(snap.ingredientIds, currentIds)) return true;

  for (const id of currentIds) {
    const ing = context.availableIngredients.find(i => i.id === id);
    if (!ing) return true;
    const prevQ = snap.ingredientQuantities[id];
    if (prevQ === undefined || prevQ !== ing.quantity) return true;
  }

  if (!sortedStringArrayEqual(snap.selectedCuisines, context.selectedCuisines)) return true;
  if (!sortedStringArrayEqual(snap.selectedCookingMethods, context.selectedCookingMethods)) return true;
  if (!sortedStringArrayEqual(snap.selectedFlavors, context.selectedFlavors)) return true;
  if (!sortedStringArrayEqual(snap.excludedIngredientIds, context.excludedIngredientIds)) return true;
  if (!sortedStringArrayEqual(snap.includedIngredientIds, context.includedIngredientIds)) return true;

  return false;
}
