import type { AIConfig, FillData, FormFieldInfo } from './types';
import { isMoonshotAnthropicStyleBase } from './moonshot-kimi';

/** 鉴权 / API Key 无效等配置问题时向用户展示的文案 */
export const AI_CALL_CONFIG_ERROR_HINT = 'AI 大模型调用失败，请检查你的AI配置';

/**
 * 是否为 API Key、鉴权类错误（与 generateWithAI 抛出的 message 格式及常见服务商响应体对齐）
 */
export function isAiAuthOrConfigFailureMessage(message: string): boolean {
  if (/AI API 调用失败 \((401|403)\)/.test(message)) return true;
  if (/authentication_error/i.test(message)) return true;
  if (/api\s*key/i.test(message) && /invalid/i.test(message)) return true;
  if (/Unauthorized/i.test(message)) return true;
  return false;
}

/** 将底层错误转为用户可见的 Error（鉴权类统一为简短提示，详情由调用方打 console） */
export function toUserFacingAiCallError(message: string): Error {
  if (isAiAuthOrConfigFailureMessage(message)) {
    return new Error(AI_CALL_CONFIG_ERROR_HINT);
  }
  return new Error(message);
}

/** 构造发给 AI 的 prompt */
function buildPrompt(fields: FormFieldInfo[]): string {
  const fieldDescriptions = fields.map((f) => {
    const parts = [`字段ID: ${f.id}`, `标签: ${f.label}`, `类型: ${f.type}`];
    if (f.required) parts.push('必填: 是');
    if (f.placeholder) parts.push(`placeholder: ${f.placeholder}`);
    if (f.ruleHints) parts.push(`校验/规则摘要(ruleHints，来自页面可见信息): ${f.ruleHints}`);
    if (f.validationError) parts.push(`当前校验错误(上一轮填充后页面展示): ${f.validationError}`);
    if (f.extra) parts.push(`表单项说明(extra): ${f.extra}`);
    if (f.options?.length) parts.push(`可选值: ${f.options.join(', ')}`);
    if (f.constraints?.maxLength) parts.push(`最大长度: ${f.constraints.maxLength}`);
    if (f.constraints?.min !== undefined) parts.push(`最小值: ${f.constraints.min}`);
    if (f.constraints?.max !== undefined) parts.push(`最大值: ${f.constraints.max}`);
    if (f.constraints?.pattern) parts.push(`HTML pattern(正则): ${f.constraints.pattern}`);
    return parts.join(' | ');
  });

  return `你是一个智能表单测试数据生成器。请根据以下表单字段信息，生成合理的中文测试数据。

## 字段列表
${fieldDescriptions.join('\n')}

## 生成规则
1. 根据字段标签语义生成合理数据（如"姓名"→中文姓名，"手机号"→11位手机号，"邮箱"→邮箱格式）
2. 对有可选值的字段（select/radio），必须从给定的可选值中选择一个
3. 必填字段必须有值
4. 遵守字段约束（最大长度、最小/最大值等）；若字段描述中含 **HTML pattern(正则)**，则填充值必须**整串匹配**该正则（仅使用 pattern 允许的字符，不要臆造未出现在字符类中的符号）；若存在「校验/规则摘要(ruleHints)」或「表单项说明(extra)」，请结合其理解校验要求（如：仅数字英文、「请输入字母或数字」= 只能含英文字母与数字无中文、最大字符数、范围、单位、小数位数），生成**能通过校验**的值；若错误/规则中出现「只能包含…」且枚举了允许字符（如字母、数字、&、=），则值**只能**由这些字符组成，**无中文、无未列出的符号**
5. 日期字段使用 YYYY-MM-DD 格式；**日期时间**（类型 date 但实际为 DateTimePicker、或标签含「执行时间」「触发时间」等）使用 **YYYY-MM-DD HH:mm:ss**，且日期部分须为 **用户本地意义的「今天」或更晚**（常见页面 disabledDate 会禁止昨天及以前；**不要**生成明显不可选的过去日）；**优先**使用 **本机「今天」起未来数日～约两周内**的日期——**越贴近当前日越容易与 disabledDate/disabledTime 对齐、填对概率越高**，不必刻意写很久以后或随意远年；若 extra 提到「需晚于名单包/计划执行时间」等，日期宜再留 1～2 天余量；若存在 disabledTime 语义（仅部分时段可选），时、分、秒宜选 **10:00～17:00** 等整点或常见工作时段，避免 0 点边界；antd@4 常见仅放开 **整点或半点**，**分钟建议只用 00 或 30**
6. 日期范围（类型为 daterange，如「开始-结束时间」）必须返回英文逗号分隔的两个日期：YYYY-MM-DD,YYYY-MM-DD（开始在前、结束在后，结束日晚于开始日）
7. checkbox 类型如果有多个可选值，用逗号分隔；单个 checkbox 返回 "true"
8. **类型为 number（InputNumber）时：填充值必须是合法数字**（整数或小数），不能是中文、字母或带单位的文字；若 extra 或约束中给出取值范围/小数要求，必须遵守
9. 若存在「当前校验错误」，说明上一轮填充值未通过校验；你必须**针对该错误修正**生成新值（不要重复同样的错）
10. **类型为 select 且字段描述中未列出「可选值」**（常见于异步加载选项）时：该字段的 value **必须**为字符串 **random**（插件会在页面上打开下拉并随机点选一项）；不要省略该 key，也不要编造页面上可能不存在的选项文案
11. **类型为 time**（纯 TimePicker、无日期）时，值为 **HH:mm:ss**；宜选 **10:00～17:00**，分钟 **00 或 30**，便于贴合常见 disabledTime（与 date 类型的日期时间不同，不要带年月日）

## 返回格式
严格返回 JSON 对象，key 为字段ID，value 为填充值。只返回 JSON，不要其他内容。

示例：
{"field_0": "张三", "field_1": "13800138000", "field_2": "选项A"}`;
}

/** Moonshot Anthropic 兼容：POST {base}/v1/messages */
async function generateWithAnthropicMessages(
  fields: FormFieldInfo[],
  config: AIConfig,
  baseUrl: string,
): Promise<FillData> {
  const userContent = buildPrompt(fields);
  const url = `${baseUrl}/v1/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 8192,
      system: '你是一个专业的测试数据生成助手，只返回 JSON 格式数据。',
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 调用失败 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const blocks = result.content as { type: string; text?: string }[] | undefined;
  const textBlock = blocks?.find((c) => c.type === 'text');
  const content = textBlock?.text;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  try {
    return JSON.parse(content) as FillData;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FillData;
    }
    throw new Error(`AI 返回的内容不是有效 JSON: ${content.slice(0, 200)}`);
  }
}

/** 调用 OpenAI 兼容 API 生成填充数据 */
export async function generateWithAI(fields: FormFieldInfo[], config: AIConfig): Promise<FillData> {
  const baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';

  if (isMoonshotAnthropicStyleBase(baseUrl)) {
    return generateWithAnthropicMessages(fields, config, baseUrl);
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的测试数据生成助手，只返回 JSON 格式数据。',
        },
        {
          role: 'user',
          content: buildPrompt(fields),
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 调用失败 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  try {
    return JSON.parse(content) as FillData;
  } catch {
    // 尝试从内容中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FillData;
    }
    throw new Error(`AI 返回的内容不是有效 JSON: ${content.slice(0, 200)}`);
  }
}
