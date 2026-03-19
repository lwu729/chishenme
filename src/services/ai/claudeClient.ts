// Claude API 客户端
// API Key 通过 EXPO_PUBLIC_CLAUDE_API_KEY 环境变量注入，客户端直接读取

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-opus-4-6';

/**
 * 向 Claude API 发送 prompt，返回文本响应。
 */
export async function callClaude(prompt: string): Promise<string> {
  // TODO: 实现 Claude API 调用
  // - 使用 fetch 发送 POST 请求到 CLAUDE_API_URL
  // - 请求头：x-api-key, anthropic-version, content-type
  // - 请求体：{ model: CLAUDE_MODEL, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }
  // - 解析响应并返回 content[0].text
  // - 处理网络错误和 API 错误
  throw new Error('TODO: callClaude not implemented');
}
