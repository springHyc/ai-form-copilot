/** 国内 Kimi 开放平台：moonshot-v1 等走 OpenAI 兼容 /v1；kimi-k2.5 走 Anthropic 兼容 /anthropic */

export const MOONSHOT_CN_CHAT_BASE = 'https://api.moonshot.cn/v1';
export const MOONSHOT_CN_ANTHROPIC_BASE = 'https://api.moonshot.cn/anthropic';

/** 根据模型选择国内区 base（不含尾斜杠） */
export function moonshotCnBaseUrlForKimiModel(model: string): string {
  return model === 'kimi-k2.5' ? MOONSHOT_CN_ANTHROPIC_BASE : MOONSHOT_CN_CHAT_BASE;
}

/** baseUrl 是否为 Moonshot Anthropic 兼容网关（任意域名以 /anthropic 结尾） */
export function isMoonshotAnthropicStyleBase(baseUrl?: string): boolean {
  const b = (baseUrl ?? '').trim().replace(/\/$/, '').toLowerCase();
  return b.endsWith('/anthropic');
}
