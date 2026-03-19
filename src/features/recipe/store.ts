import { create } from 'zustand';
import { Recipe, RecipeSortOrder } from './types';

interface RecipeStore {
  recipes: Recipe[];
  sortOrder: RecipeSortOrder;
  selectedCuisines: string[];
  selectedCookingMethods: string[];
  selectedFlavors: string[];

  // TODO: loadRecipes() — 从 SQLite 读取所有菜谱
  // TODO: addRecipe(recipe: Recipe) — 插入新菜谱
  // TODO: deleteRecipe(id: string) — 删除菜谱
  // TODO: toggleFavorite(id: string) — 切换收藏状态（上限 MAX_FAVORITED_RECIPES）
  // TODO: setSortOrder(order: RecipeSortOrder) — 设置排序方式
  // TODO: setSelectedCuisines(cuisines: string[]) — 设置菜系筛选
  // TODO: setSelectedCookingMethods(methods: string[]) — 设置烹饪方式筛选
  // TODO: setSelectedFlavors(flavors: string[]) — 设置口味筛选
  // TODO: resetFilters() — 重置所有筛选条件
}

export const useRecipeStore = create<RecipeStore>(() => ({
  recipes: [],
  sortOrder: RecipeSortOrder.MOST_URGENT,
  selectedCuisines: [],
  selectedCookingMethods: [],
  selectedFlavors: [],
}));

