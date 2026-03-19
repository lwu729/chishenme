import { callClaudeWithImage } from './claudeClient';

export interface ScannedIngredient {
  name: string;
  quantity: number;
  unit: string;
  estimatedExpiryDays: number;
  boundingBox?: {
    x: number; // 0-1, 左上角 x
    y: number; // 0-1, 左上角 y
    width: number; // 0-1
    height: number; // 0-1
  };
}

const SYSTEM_PROMPT = `你是一个食材识别助手。用户会发送食物或超市货架的照片，请识别图片中所有可见的食材。
严格只返回 JSON，格式如下，不要任何额外文字或 markdown：
{
  "ingredients": [
    {
      "name": "食材名称（中文）",
      "quantity": 数字,
      "unit": "单位",
      "estimatedExpiryDays": 建议保存天数（整数，从今天开始）,
      "boundingBox": {
        "x": 0.1,
        "y": 0.2,
        "width": 0.3,
        "height": 0.25
      }
    }
  ]
}
识别规则：
- 如果看到包装食品，尽量从标签读取保质期并换算成天数
- 如果是散装蔬菜/水果，根据常识给出建议保存天数
- 单位使用中文日常表达（碗/杯/个/把/汤匙/克/毫升等）
- 数量用合理的估算值，不要为 0
- 只识别食材，不要识别餐具、背景物品等
- boundingBox 使用归一化坐标（0-1），表示食材在原图中的矩形位置
- 如果无法可靠定位，boundingBox 可省略`;

/**
 * 识别图片中的食材，返回 ScannedIngredient 数组。
 */
export async function scanIngredient(
  imageBase64: string,
  mediaType: string,
): Promise<ScannedIngredient[]> {
  const raw = await callClaudeWithImage(SYSTEM_PROMPT, imageBase64, mediaType);

  // 去掉可能存在的 markdown code block
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned) as { ingredients: ScannedIngredient[] };
  return parsed.ingredients;
}
