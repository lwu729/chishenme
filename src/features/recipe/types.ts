// ============ RECIPE ============
export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  durationMinutes?: number; // 分钟
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  durationMinutes: number; // 分钟
  cuisine: string; // 菜系
  cookingMethod: string; // 烹饪方式
  flavor: string; // 口味
  totalSteps: number;
  steps: RecipeStep[];
  isFavorited: boolean;
  createdAt: string; // ISO date string
}

export enum RecipeSortOrder {
  MOST_URGENT = 'most_urgent', // 使用最即将过期食材优先（默认）
  FAVORITED_FIRST = 'favorited_first', // 收藏菜谱优先
  ALL_TAGS_MATCH = 'all_tags_match', // 符合所有标签优先
  SHORTEST_TIME = 'shortest_time', // 做饭时间短优先
  FEWEST_STEPS = 'fewest_steps', // 步骤少优先
}

