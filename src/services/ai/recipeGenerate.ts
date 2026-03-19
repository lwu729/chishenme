import { Ingredient } from '../../features/ingredient/types';
import { Recipe, RecipeSortOrder, RecipeStep } from '../../features/recipe/types';
import { UserPreference } from '../../features/user/types';

export interface RecipeGenerationContext {
  availableIngredients: Ingredient[]; // 当前冰箱所有食材
  excludedIngredientIds: string[]; // filterState = EXCLUDE 的食材 id
  includedIngredientIds: string[]; // filterState = INCLUDE 的食材 id
  selectedCuisines: string[];
  selectedCookingMethods: string[];
  selectedFlavors: string[];
  userPreference: UserPreference;
  favoritedRecipes: Recipe[]; // 收藏菜谱，供 AI 参考偏好
  sortOrder: RecipeSortOrder;
  relatedIngredients?: Ingredient[]; // 过期提醒时传入相关食材
  relatedRecipeStep?: RecipeStep; // 做饭提示时传入当前步骤
}

/**
 * 根据当前冰箱食材和用户偏好，生成菜谱列表。
 * @param context - 包含食材、偏好、过滤条件等完整上下文
 */
export async function generateRecipes(context: RecipeGenerationContext): Promise<Recipe[]> {
  // TODO: 实现菜谱生成
  // - 根据 context 构建详细的菜谱生成 prompt
  //   · 优先使用 includedIngredientIds 对应的食材
  //   · 排除 excludedIngredientIds 对应的食材
  //   · 按 sortOrder 排序提示 AI 生成顺序
  //   · 参考 favoritedRecipes 推断用户口味偏好
  //   · 结合 userPreference 中的烹饪工具、调料等约束
  // - 调用 callClaude，要求返回 JSON 格式的 Recipe[]
  // - 解析并校验返回结果
  throw new Error('TODO: generateRecipes not implemented');
}
