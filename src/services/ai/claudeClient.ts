// Claude API 客户端
// API Key 通过 EXPO_PUBLIC_CLAUDE_API_KEY 环境变量注入，客户端直接读取

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-opus-4-6';
const CLAUDE_VISION_MODEL = 'claude-opus-4-5';

async function callAPI(body: object): Promise<string> {
  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

/**
 * 向 Claude API 发送 prompt，返回文本响应。
 */
export async function callClaude(prompt: string): Promise<string> {
  return callAPI({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
}

/**
 * 向 Claude API 发送图片 + prompt，返回文本响应。
 * 使用支持 vision 的 claude-opus-4-5 模型。
 */
export async function callClaudeWithImage(
  prompt: string,
  imageBase64: string,
  mediaType: string,
): Promise<string> {
  return callAPI({
    model: CLAUDE_VISION_MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
}
