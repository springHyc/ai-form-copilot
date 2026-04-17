import type { AIConfig, FillData, FormFieldInfo } from './types';

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
  | ErrorMessage;
