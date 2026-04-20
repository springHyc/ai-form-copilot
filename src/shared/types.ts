/** 表单字段类型 */
export type FieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
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
  };
  /** 当前值（如果已有） */
  currentValue?: string;
}

/** AI 生成的填充数据 */
export interface FillData {
  [fieldId: string]: string | number | boolean;
}

/** AI 服务配置 */
export interface AIConfig {
  provider: 'openai' | 'deepseek' | 'kimi' | 'custom';
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

export const DEFAULT_SETTINGS: Settings = {
  aiConfig: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
  },
  useMockFallback: true,
};
