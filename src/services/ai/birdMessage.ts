import { BirdCompanion } from '../../features/bird/types';
import { UserEvent } from '../../features/user/types';
import { Ingredient } from '../../features/ingredient/types';
import { RecipeStep } from '../../features/recipe/types';

export interface BirdMessageContext {
  bird: BirdCompanion;
  userEvent: UserEvent;
  relatedIngredients?: Ingredient[]; // 与消息相关的食材（如过期提醒）
  relatedRecipeStep?: RecipeStep; // 与消息相关的菜谱步骤
}

/**
 * 以小鸟伙伴的风格生成消息文本（过期提醒、做饭鼓励、解锁庆祝等）。
 * @param context - 包含小鸟信息、用户状态及相关上下文
 */
export async function generateBirdMessage(context: BirdMessageContext): Promise<string> {
  // TODO: 实现小鸟消息生成
  // - 从 context.bird.personalityDescription 提取风格描述注入 system prompt
  // - 根据 context.relatedIngredients 生成过期提醒消息
  // - 根据 context.relatedRecipeStep 生成做饭步骤提示消息
  // - 调用 callClaude，返回纯文本消息字符串
  throw new Error('TODO: generateBirdMessage not implemented');
}
