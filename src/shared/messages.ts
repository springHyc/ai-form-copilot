import type {
  AIConfig,
  FieldMappingResult,
  FillData,
  FormFieldInfo,
  IssueCategoryNode,
  IssueClassificationResult,
  PastedTextSlots,
} from './types';

/** 消息类型枚举 */
export enum MessageType {
  /** Popup -> Background: 请求扫描当前页面表单 */
  SCAN_FORM = 'SCAN_FORM',
  /** Content -> Background: 返回扫描结果 */
  SCAN_RESULT = 'SCAN_RESULT',
  /** Popup -> Background: 请求 AI 生成填充数据 */
  GENERATE_DATA = 'GENERATE_DATA',
  /** Background -> Popup: 返回生成的填充数据 */
  GENERATE_RESULT = 'GENERATE_RESULT',
  /** Popup -> Background -> Content: 执行填充 */
  FILL_FORM = 'FILL_FORM',
  /** Content -> Background -> Popup: 填充完成 */
  FILL_RESULT = 'FILL_RESULT',
  /** Background -> Content: 等待联动字段渲染后返回最新扫描结果 */
  WAIT_LINKED_FIELDS = 'WAIT_LINKED_FIELDS',
  /** Content -> Background: 联动字段等待结果 */
  WAIT_LINKED_FIELDS_RESULT = 'WAIT_LINKED_FIELDS_RESULT',
  /** Popup -> Background: 粘贴文本直填 */
  PASTE_TEXT_FILL = 'PASTE_TEXT_FILL',
  /** Background -> Popup: 粘贴文本直填结果 */
  PASTE_TEXT_FILL_RESULT = 'PASTE_TEXT_FILL_RESULT',
  /** 通用错误 */
  ERROR = 'ERROR',
}

export interface ScanFormMessage {
  type: MessageType.SCAN_FORM;
}

export interface ScanResultMessage {
  type: MessageType.SCAN_RESULT;
  fields: FormFieldInfo[];
}

export interface GenerateDataMessage {
  type: MessageType.GENERATE_DATA;
  fields: FormFieldInfo[];
  aiConfig: AIConfig;
}

export interface GenerateResultMessage {
  type: MessageType.GENERATE_RESULT;
  data: FillData;
}

export interface FillFormMessage {
  type: MessageType.FILL_FORM;
  data: FillData;
}

export interface FillResultMessage {
  type: MessageType.FILL_RESULT;
  success: boolean;
  filledCount: number;
}

export interface WaitLinkedFieldsMessage {
  type: MessageType.WAIT_LINKED_FIELDS;
  expectedLabels: string[];
  timeoutMs?: number;
  pollMs?: number;
}

export interface WaitLinkedFieldsResultMessage {
  type: MessageType.WAIT_LINKED_FIELDS_RESULT;
  fields: FormFieldInfo[];
  timedOut: boolean;
}

export interface PasteTextFillMessage {
  type: MessageType.PASTE_TEXT_FILL;
  text: string;
  fields: FormFieldInfo[];
  issueTree?: IssueCategoryNode[];
}

export interface PasteTextFillResultMessage {
  type: MessageType.PASTE_TEXT_FILL_RESULT;
  success: boolean;
  filledCount: number;
  data: FillData;
  mappings: FieldMappingResult[];
  slots: PastedTextSlots;
  classification?: IssueClassificationResult;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  error: string;
}

export type Message =
  | ScanFormMessage
  | ScanResultMessage
  | GenerateDataMessage
  | GenerateResultMessage
  | FillFormMessage
  | FillResultMessage
  | WaitLinkedFieldsMessage
  | WaitLinkedFieldsResultMessage
  | PasteTextFillMessage
  | PasteTextFillResultMessage
  | ErrorMessage;
