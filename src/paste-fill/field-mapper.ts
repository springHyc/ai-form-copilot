import type {
  FieldMappingResult,
  FillData,
  FormFieldInfo,
  IssueCategoryNode,
  PastedTextMappingPlan,
} from '@/shared/types';
import { classifyIssueByHierarchy } from './issue-classifier';
import { parseAndCacheIssueTree } from './issue-tree';
import { extractPastedTextSlots } from './text-slots';

interface BuildPlanOptions {
  issueTree?: IssueCategoryNode[] | string;
  includeFunder?: boolean;
  onlyFunder?: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractExplicitKeyedValue(text: string, key: string, nextKeys: string[]): string | undefined {
  const boundary = nextKeys.map((item) => `${escapeRegExp(item)}\\s*[:：]`).join('|');
  const pattern = boundary
    ? new RegExp(`${escapeRegExp(key)}\\s*[:：]\\s*([\\s\\S]*?)\\s*(?=(?:${boundary})|$)`)
    : new RegExp(`${escapeRegExp(key)}\\s*[:：]\\s*([\\s\\S]*?)\\s*$`);
  const match = text.match(pattern);
  const value = match?.[1]?.trim();
  return value || undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[：:()（）\-_]/g, '');
}

function findOptionMatch(optionText: string, candidate: string): number {
  const option = normalize(optionText);
  const token = normalize(candidate);
  if (!option || !token) return 0;
  if (option === token) return 1;
  if (option.includes(token) || token.includes(option)) return 0.88;
  return 0;
}

function bestOptionMatch(options: string[] | undefined, candidates: string[]): { value?: string; score: number } {
  if (!options || options.length === 0 || candidates.length === 0) return { score: 0 };
  let bestScore = 0;
  let bestValue: string | undefined;
  for (const option of options) {
    for (const candidate of candidates) {
      const score = findOptionMatch(option, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestValue = option;
      }
    }
  }
  return { value: bestValue, score: bestScore };
}

function bestDirectCandidate(candidates: string[]): string | undefined {
  return candidates.find((candidate) => candidate.trim().length > 0);
}

function resolvePhoneFields(phones: string[]): { incoming?: string; register?: string } {
  if (phones.length === 0) return {};
  if (phones.length === 1) {
    return { incoming: phones[0], register: phones[0] };
  }
  return {
    incoming: phones[0],
    register: phones[1] ?? phones[0],
  };
}

function pushMappingResult(
  mappings: FieldMappingResult[],
  field: FormFieldInfo,
  value: string | undefined,
  confidence: number,
  reason: string,
): void {
  mappings.push({
    fieldId: field.id,
    fieldLabel: field.label,
    value,
    autoFilled: Boolean(value),
    confidence,
    reason,
  });
}

export function buildPastedTextMappingPlan(
  fields: FormFieldInfo[],
  text: string,
  options: BuildPlanOptions = {},
): PastedTextMappingPlan {
  const slots = extractPastedTextSlots(text);
  const explicitSource = extractExplicitKeyedValue(slots.normalizedText, '工单来源', ['端口', '产品名称', '资金方']);
  const explicitPort = extractExplicitKeyedValue(slots.normalizedText, '端口', ['产品名称', '资金方', '工单来源']);
  const explicitProduct = extractExplicitKeyedValue(slots.normalizedText, '产品名称', ['资金方', '工单来源', '端口']);
  const explicitFunder = extractExplicitKeyedValue(slots.normalizedText, '资金方', ['工单来源', '端口', '产品名称']);
  const issueTree = parseAndCacheIssueTree(options.issueTree);
  const classification = classifyIssueByHierarchy(slots, issueTree);
  const data: FillData = {};
  const mappings: FieldMappingResult[] = [];
  const phones = resolvePhoneFields(slots.phones);

  for (const field of fields) {
    const label = normalize(field.label);

    if (options.onlyFunder && !label.includes('资金方')) {
      continue;
    }

    if (label.includes('来电号')) {
      const value = phones.incoming;
      if (value) data[field.id] = value;
      pushMappingResult(mappings, field, value, value ? 0.95 : 0.2, value ? '手机号规则命中：来电号码' : '未提取到手机号');
      continue;
    }

    if (label.includes('注册号') || label.includes('注册手机号')) {
      const value = phones.register;
      if (value) data[field.id] = value;
      pushMappingResult(mappings, field, value, value ? 0.95 : 0.2, value ? '手机号规则命中：注册号码' : '未提取到手机号');
      continue;
    }

    if (label.includes('客诉内容') || label.includes('投诉内容') || label.includes('客诉') || label.includes('问题描述')) {
      const value = slots.complaintContent;
      if (value) data[field.id] = value;
      pushMappingResult(mappings, field, value, value ? 0.9 : 0.2, value ? '正文映射：客诉内容' : '客诉正文为空');
      continue;
    }

    if (label.includes('工单来源')) {
      const matched = bestOptionMatch(field.options, slots.channelTokens);
      const direct = explicitSource ?? bestDirectCandidate(slots.channelTokens);
      const useDirect = (!field.options || field.options.length === 0) && Boolean(direct);
      if (matched.value && matched.score >= 0.85) data[field.id] = matched.value;
      else if (useDirect && direct) data[field.id] = direct;
      pushMappingResult(
        mappings,
        field,
        matched.score >= 0.85 ? matched.value : useDirect ? direct : undefined,
        matched.score >= 0.85 ? matched.score : useDirect ? 0.82 : matched.score,
        matched.score >= 0.85
          ? '来源选项命中'
          : useDirect
            ? '来源字段无选项快照，按显式键值尝试填充'
            : '来源候选未命中合法选项',
      );
      continue;
    }

    if (label.includes('端口')) {
      const candidates = slots.channelTokens;
      const matched = bestOptionMatch(field.options, candidates);
      const direct = explicitPort ?? bestDirectCandidate(candidates);
      const useDirect = (!field.options || field.options.length === 0) && Boolean(direct);
      if (matched.value && matched.score >= 0.85) data[field.id] = matched.value;
      else if (useDirect && direct) data[field.id] = direct;
      pushMappingResult(
        mappings,
        field,
        matched.score >= 0.85 ? matched.value : useDirect ? direct : undefined,
        matched.score >= 0.85 ? matched.score : useDirect ? 0.82 : matched.score,
        matched.score >= 0.85
          ? '端口选项命中'
          : useDirect
            ? '端口字段无选项快照，按显式键值尝试填充'
            : '端口候选未命中合法选项',
      );
      continue;
    }

    if (label.includes('产品')) {
      const matched = bestOptionMatch(field.options, slots.productTokens);
      const direct = explicitProduct ?? bestDirectCandidate(slots.productTokens);
      const useDirect = (!field.options || field.options.length === 0) && Boolean(direct);
      if (matched.value && matched.score >= 0.85) data[field.id] = matched.value;
      else if (useDirect && direct) data[field.id] = direct;
      pushMappingResult(
        mappings,
        field,
        matched.score >= 0.85 ? matched.value : useDirect ? direct : undefined,
        matched.score >= 0.85 ? matched.score : useDirect ? 0.82 : matched.score,
        matched.score >= 0.85
          ? '产品选项命中'
          : useDirect
            ? '产品字段无选项快照，按显式键值尝试填充'
            : '产品候选未命中合法选项',
      );
      continue;
    }

    if (label.includes('资金方')) {
      if (!options.includeFunder) {
        pushMappingResult(mappings, field, undefined, 0.3, '第一阶段跳过资金方，等待产品联动');
        continue;
      }
      const matched = bestOptionMatch(field.options, slots.funderTokens);
      const direct = explicitFunder ?? bestDirectCandidate(slots.funderTokens);
      const useDirect = (!field.options || field.options.length === 0) && Boolean(direct);
      if (matched.value && matched.score >= 0.85) data[field.id] = matched.value;
      else if (useDirect && direct) data[field.id] = direct;
      pushMappingResult(
        mappings,
        field,
        matched.score >= 0.85 ? matched.value : useDirect ? direct : undefined,
        matched.score >= 0.85 ? matched.score : useDirect ? 0.78 : matched.score,
        matched.score >= 0.85
          ? '资金方选项命中'
          : useDirect
            ? '资金方字段无选项快照，按显式键值尝试填充'
            : '资金方候选未命中合法选项',
      );
      continue;
    }

    if (field.type === 'cascader' && (label.includes('问题类型') || label.includes('分类'))) {
      if (classification.pathLabels.length > 0) {
        const value = classification.pathLabels.join(' > ');
        data[field.id] = value;
        pushMappingResult(
          mappings,
          field,
          value,
          classification.confidence,
          `分层分类命中，停在第 ${classification.stoppedAtLevel} 层`,
        );
      } else {
        pushMappingResult(mappings, field, undefined, 0.2, classification.reason ?? '分类结果为空');
      }
      continue;
    }
  }

  return {
    slots,
    data,
    mappings,
    classification,
  };
}
