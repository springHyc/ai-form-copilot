/** 表单字段类型 */
export type FieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'time'
  | 'date'
  | 'daterange'
  | 'number'
  | 'cascader'
  | 'treeselect'
  | 'switch'
  | 'transfer'
  | 'custom';

/** 扫描到的表单字段信息（可序列化，用于跨脚本传递） */
export interface FormFieldInfo {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  /**
   * 从 DOM 推断的校验/规则摘要（antd 运行时 rules 对象通常不在 DOM 中，只能尽量从 tooltip、
   * rules 的 message 文案、placeholder 等可见信息还原）
   */
  ruleHints?: string;
  /**
   * 当前页面上该表单项已展示的校验错误（来自 .ant-form-item-explain-error 等）。
   * 用于多轮「扫描→生成→填充」闭环：上一轮填错后，下一轮把错误文案回灌进生成器。
   */
  validationError?: string;
  /** Form.Item 的 extra：表单项下方说明文字，用于辅助生成合理数据 */
  extra?: string;
  options?: string[];
  constraints?: {
    maxLength?: number;
    min?: number;
    max?: number;
    /** 来自 DOM input/textarea 的 HTML pattern（若框架下发），用于 Mock/AI 按正则字符集生成 */
    pattern?: string;
  };
  /** 当前值（如果已有） */
  currentValue?: string;
}

/** AI 生成的填充数据 */
export interface FillData {
  [fieldId: string]: string | number | boolean;
}

/** 粘贴文本抽取出的结构化槽位 */
export interface PastedTextSlots {
  rawText: string;
  normalizedText: string;
  complaintContent: string;
  phones: string[];
  idCards: string[];
  names: string[];
  channelTokens: string[];
  productTokens: string[];
  funderTokens: string[];
}

/** 问题分类单个节点（四级树可递归扩展） */
export interface IssueCategoryNode {
  label: string;
  value: string;
  children?: IssueCategoryNode[];
}

/** 问题分类分层决策结果 */
export interface IssueClassificationResult {
  pathLabels: string[];
  pathValues: string[];
  stoppedAtLevel: 1 | 2 | 3 | 4 | 0;
  confidence: number;
  reason?: string;
}

/** 单个字段的映射结果，用于 UI 和日志回显 */
export interface FieldMappingResult {
  fieldId: string;
  fieldLabel: string;
  value?: string;
  autoFilled: boolean;
  confidence: number;
  reason: string;
}

/** 粘贴文本填表总结果（执行前映射） */
export interface PastedTextMappingPlan {
  slots: PastedTextSlots;
  data: FillData;
  mappings: FieldMappingResult[];
  classification?: IssueClassificationResult;
}

/** 内置 AI 服务商（均为 OpenAI Chat Completions 兼容路径，除 Kimi K2.5 等走 Anthropic 兼容，见 moonshot-kimi） */
export type AiProvider =
  | 'openai'
  | 'deepseek'
  | 'kimi'
  /** 智谱 GLM，OpenAI 兼容 */
  | 'zhipu'
  /** 阿里云百炼 DashScope 兼容模式 */
  | 'bailian'
  /** MiniMax 国内 OpenAI 兼容 */
  | 'minimax'
  /** 火山引擎方舟（豆包等），OpenAI 兼容 */
  | 'volcengine'
  /** 硅基流动等聚合路由，OpenAI 兼容 */
  | 'siliconflow'
  /** 百川智能，OpenAI 兼容 */
  | 'baichuan'
  | 'custom';

/** AI 服务配置 */
export interface AIConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/** 插件全局设置 */
export interface Settings {
  aiConfig: AIConfig;
  /** 没有 AI 时使用内置 mock 规则 */
  useMockFallback: boolean;
}

const BUILT_IN_DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY ?? '';

export const DEFAULT_SETTINGS: Settings = {
  aiConfig: {
    provider: 'deepseek',
    apiKey: BUILT_IN_DEEPSEEK_API_KEY,
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
  },
  useMockFallback: false,
};
