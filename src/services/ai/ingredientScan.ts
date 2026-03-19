import { Ingredient } from '../../features/ingredient/types';

/**
 * 识别图片中的食材，返回部分填充的 Ingredient 数组（不含 id、loggedDate 等需要客户端补全的字段）。
 * @param imageBase64 - Base64 编码的图片字符串
 */
export async function scanIngredient(imageBase64: string): Promise<Partial<Ingredient>[]> {
  // TODO: 实现食材识别
  // - 构建包含图片的 vision prompt
  // - 调用 callClaude 或直接调用 Claude API（支持 vision）
  // - 解析返回的 JSON，提取 name / quantity / unit / expiryDate / storageLocation
  // - 返回 Partial<Ingredient>[] 供调用方补全剩余字段
  throw new Error('TODO: scanIngredient not implemented');
}
