import { callClaude } from './claudeClient';

/**
 * 根据当前步骤和小鸟性格，用 AI 实时生成一条烹饪小贴士。
 */
export async function generateBirdCookingTip(
  stepDescription: string,
  birdPersonalityPrompt: string,
  language: 'zh' | 'en',
): Promise<string> {
  let prompt: string;

  if (language === 'en') {
    prompt = `You are a bird companion in a cooking app. Your personality: ${birdPersonalityPrompt}
The user is on this cooking step: "${stepDescription}"
Give ONE short cooking tip related to this step, in your personality's voice.
Max 2 sentences. English only. No quotation marks.`;
  } else {
    prompt = `你是一个烹饪 app 里的小鸟伙伴。你的性格：${birdPersonalityPrompt}
用户正在进行这个步骤：「${stepDescription}」
用你的性格语气给出一条和这个步骤相关的简短烹饪小贴士。最多两句话。只用中文。不加引号。`;
  }

  return callClaude(prompt);
}
