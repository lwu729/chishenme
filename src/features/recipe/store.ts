import { create } from 'zustand';
import { Recipe, RecipeSortOrder } from './types';
import { RecipeGenerationContext, generateRecipes } from '../../services/ai/recipeGenerate';
import { getDatabase } from '../../db/database';

const MAX_FAVORITED_RECIPES = 10;

interface RecipeStore {
  currentRecipes: Recipe[];
  favoritedRecipes: Recipe[];
  isLoading: boolean;
  sortOrder: RecipeSortOrder;
  selectedCuisines: string[];
  selectedCookingMethods: string[];
  selectedFlavors: string[];

  loadFavoritedRecipes: () => void;
  generateAndSetRecipes: (context: RecipeGenerationContext) => Promise<void>;
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
      set({ currentRecipes: marked, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

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
