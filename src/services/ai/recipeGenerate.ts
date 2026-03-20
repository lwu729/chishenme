import { Ingredient } from '../../features/ingredient/types';
import { Recipe, RecipeSortOrder, RecipeStep } from '../../features/recipe/types';
import { UserPreference } from '../../features/user/types';
import { callClaude } from './claudeClient';
import i18n from '../../i18n';

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

function buildSystemPrompt(measuringToolsStr: string): string {
  return `你是一个中文菜谱生成助手。根据用户提供的冰箱食材和条件，生成适合的菜谱。
严格只返回 JSON，不要任何额外文字或 markdown 代码块，格式如下：
{
  "recipes": [
    {
      "name": "菜名",
      "cuisine": "菜系",
      "cookingMethod": "烹饪方式",
      "flavor": "口味",
      "durationMinutes": 30,
      "ingredients": [
        { "name": "食材名", "quantity": 200, "unit": "克" }
      ],
      "steps": [
        { "stepNumber": 1, "instruction": "步骤说明", "durationMinutes": 5 }
      ]
    }
  ]
}
注意：
- 生成恰好 5 个菜谱
- 所需食材的数量单位规则：
  - 如果用户没有登记任何测量工具，请使用不需要量器的单位：一碗、一杯、一把、一汤匙、一小撮、一个、一块、一片等，严禁使用克、毫升、ml、g、kg 等需要测量工具的单位
  - 如果用户登记了测量工具（如下方列出），可以使用对应的精确单位，例如有厨房秤则可用克/公克，有量杯则可用毫升/ml
  - 用户已登记的测量工具：${measuringToolsStr}
- 步骤清晰，每步骤有具体操作说明
- 严格输出 JSON，不要任何前缀或后缀文字`;
}

/**
 * 根据当前冰箱食材和用户偏好，生成菜谱列表。
 */
export async function generateRecipes(context: RecipeGenerationContext): Promise<Recipe[]> {
  const measuringToolsStr = context.userPreference.measuringTools?.length > 0
    ? context.userPreference.measuringTools.join('、')
    : '无';
  const language = (i18n.language === 'en' ? 'en' : 'zh') as 'zh' | 'en';
  const prompt = buildPrompt(context, language);
  const raw = await callClaude(prompt, buildSystemPrompt(measuringToolsStr));

  // 去掉可能的 markdown 代码块标记
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: { recipes: any[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('菜谱生成失败，请重试');
  }

  if (!parsed?.recipes || !Array.isArray(parsed.recipes)) {
    throw new Error('菜谱生成失败，请重试');
  }

  const today = new Date().toISOString();

  return parsed.recipes.map((r: any) => {
    const steps: RecipeStep[] = Array.isArray(r.steps) ? r.steps : [];
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: r.name ?? '未知菜谱',
      cuisine: r.cuisine ?? '家常',
      cookingMethod: r.cookingMethod ?? '炒菜',
      flavor: r.flavor ?? '清淡',
      durationMinutes: typeof r.durationMinutes === 'number' ? r.durationMinutes : 30,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      steps,
      totalSteps: steps.length,
      isFavorited: false,
      createdAt: today,
    };
  });
}

function buildPrompt(ctx: RecipeGenerationContext, language: 'zh' | 'en'): string {
  const lines: string[] = [];
  const excludedSet = new Set(ctx.excludedIngredientIds);
  const includedSet = new Set(ctx.includedIngredientIds);

  const available = ctx.availableIngredients.filter(i => !excludedSet.has(i.id));
  lines.push('【冰箱食材】');
  if (available.length === 0) {
    lines.push('（冰箱暂无食材，请根据常见家常食材生成菜谱）');
  } else {
    for (const ing of available) {
      const priority = includedSet.has(ing.id) ? '【优先使用】' : '';
      const expiryText =
        ing.daysUntilExpiry <= 0
          ? '已过期'
          : `${ing.daysUntilExpiry}天后到期`;
      lines.push(`- ${ing.name} ${ing.quantity}${ing.unit}（${expiryText}）${priority}`);
    }
  }

  lines.push('\n【生成偏好】');
  const sortHint: Record<RecipeSortOrder, string> = {
    [RecipeSortOrder.MOST_URGENT]: '优先消耗即将过期的食材',
    [RecipeSortOrder.FAVORITED_FIRST]: '参考用户收藏菜谱的风格和口味',
    [RecipeSortOrder.ALL_TAGS_MATCH]: '尽量同时满足所有筛选条件',
    [RecipeSortOrder.SHORTEST_TIME]: '烹饪总时间越短越好',
    [RecipeSortOrder.FEWEST_STEPS]: '烹饪步骤越少越好',
  };
  lines.push(sortHint[ctx.sortOrder]);

  const hasFilters =
    ctx.selectedCuisines.length ||
    ctx.selectedCookingMethods.length ||
    ctx.selectedFlavors.length;
  if (hasFilters) {
    lines.push('\n【用户筛选条件（每组条件满足其中一个即可）】');
    if (ctx.selectedCuisines.length) lines.push(`- 菜系（任选其一）：${ctx.selectedCuisines.join('、')}`);
    if (ctx.selectedCookingMethods.length) lines.push(`- 烹饪方式（任选其一）：${ctx.selectedCookingMethods.join('、')}`);
    if (ctx.selectedFlavors.length) lines.push(`- 口味（任选其一）：${ctx.selectedFlavors.join('、')}`);
  }

  const pref = ctx.userPreference;
  const prefLines: string[] = [];
  if (pref.cookingTools?.length) prefLines.push(`- 可用烹饪工具：${pref.cookingTools.join('、')}`);
  if (pref.condiments?.length) prefLines.push(`- 可用调料：${pref.condiments.join('、')}`);
  if (pref.preferredCuisines?.length && !ctx.selectedCuisines.length)
    prefLines.push(`- 偏好菜系：${pref.preferredCuisines.join('、')}`);
  if (pref.preferredCookingMethods?.length && !ctx.selectedCookingMethods.length)
    prefLines.push(`- 偏好烹饪方式：${pref.preferredCookingMethods.join('、')}`);
  if (pref.preferredFlavors?.length && !ctx.selectedFlavors.length)
    prefLines.push(`- 偏好口味：${pref.preferredFlavors.join('、')}`);
  if (prefLines.length) {
    lines.push('\n【用户偏好】');
    lines.push(...prefLines);
  }

  if (ctx.favoritedRecipes.length) {
    lines.push('\n【用户收藏菜谱（参考口味偏好）】');
    ctx.favoritedRecipes.slice(0, 5).forEach(r => {
      lines.push(`- ${r.name}（${r.cuisine}・${r.flavor}・${r.cookingMethod}）`);
    });
  }

  if (language === 'en') {
    lines.push('\nGenerate exactly 5 recipes. Steps should be detailed and ingredient quantities specific.');
    lines.push(`
IMPORTANT LANGUAGE INSTRUCTIONS:
1. All ingredient names in the list above may be in Chinese. Before generating recipes, mentally translate all ingredient names to English.
2. Generate ALL output in English: recipe names, cuisine types, cooking methods, flavors, ingredient names, units, and every step description must be in English.
3. Use natural English cooking terminology (e.g. "stir-fry", "simmer", "season to taste").
4. Recipe names should be natural English dish names, not literal translations.`);
  } else {
    lines.push('\n请生成恰好 5 个适合的菜谱，步骤详细，食材用量具体。');
  }

  return lines.join('\n');
}
