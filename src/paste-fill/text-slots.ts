import type { PastedTextSlots } from '@/shared/types';

const PHONE_RE = /(?<!\d)(1[3-9]\d{9})(?!\d)/g;
const IDCARD_RE = /(?<!\d)(\d{17}[\dXx])(?!\d)/g;
const CHINESE_NAME_RE = /^[\u4e00-\u9fa5]{2,4}$/;

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractValueByKey(text: string, key: string, nextKeys: string[]): string | undefined {
  const boundary = nextKeys.map((item) => `${escapeRegExp(item)}\\s*[:：]`).join('|');
  const pattern = boundary
    ? new RegExp(`${escapeRegExp(key)}\\s*[:：]\\s*([\\s\\S]*?)\\s*(?=(?:${boundary})|$)`)
    : new RegExp(`${escapeRegExp(key)}\\s*[:：]\\s*([\\s\\S]*?)\\s*$`);
  const match = text.match(pattern);
  const value = match?.[1]?.trim();
  return value || undefined;
}

export function normalizePastedText(rawText: string): string {
  return rawText
    .replace(/\r\n?/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[，]/g, ',')
    .replace(/[；]/g, ';')
    .replace(/[：]/g, ':')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPhones(text: string): string[] {
  return uniqueStrings(Array.from(text.matchAll(PHONE_RE)).map((m) => m[1]));
}

function extractIdCards(text: string): string[] {
  return uniqueStrings(Array.from(text.matchAll(IDCARD_RE)).map((m) => m[1].toUpperCase()));
}

function extractNames(lines: string[], phones: string[]): string[] {
  const names: string[] = [];
  for (const line of lines.slice(0, 4)) {
    const parts = line.split(/[\s,;:，；：]+/).filter(Boolean);
    for (const part of parts) {
      if (phones.includes(part)) continue;
      if (CHINESE_NAME_RE.test(part)) names.push(part);
    }
  }
  return uniqueStrings(names);
}

function extractComplaintContent(normalized: string): string {
  const markerMatch = normalized.match(/(客诉内容|客户进线情况描述|客户进线描述|投诉内容)\s*:/);
  if (markerMatch && markerMatch.index !== undefined) {
    const sliced = normalized.slice(markerMatch.index + markerMatch[0].length).trim();
    if (sliced) return sliced;
  }
  return normalized;
}

function extractChannelTokens(lines: string[]): string[] {
  const merged = lines.join('\n');
  const explicitSource = extractValueByKey(merged, '工单来源', ['端口', '产品名称', '资金方']);
  const explicitPort = extractValueByKey(merged, '端口', ['产品名称', '资金方', '工单来源']);
  const explicit = [explicitSource, explicitPort].filter(Boolean) as string[];

  const hitLine = lines.find((line) =>
    /(端外|端内|监管微信小程序|工单来源|来源|渠道)/.test(line),
  );
  const fuzzy = hitLine
    ? hitLine.split(/[、,;，；]/).map((s) => s.trim()).filter(Boolean)
    : [];
  return uniqueStrings([...explicit, ...fuzzy]);
}

function extractProductAndFunderTokens(lines: string[]): {
  productTokens: string[];
  funderTokens: string[];
} {
  const merged = lines.join('\n');
  const productTokens: string[] = [];
  const funderTokens: string[] = [];

  const explicitProduct = extractValueByKey(merged, '产品名称', ['资金方', '工单来源', '端口']);
  const explicitFunder = extractValueByKey(merged, '资金方', ['工单来源', '端口', '产品名称']);
  if (explicitProduct) productTokens.push(explicitProduct);
  if (explicitFunder) funderTokens.push(explicitFunder);

  for (const line of lines) {
    if (!/(分期|贷款|产品|消金|资方|海尔|钱小乐|榕树)/.test(line)) continue;
    const tokens = line.split(/[、,;，；]/).map((s) => s.trim()).filter(Boolean);
    for (const token of tokens) {
      if (!token) continue;
      if (/(资方|消金|海尔|银行|金控)/.test(token)) {
        funderTokens.push(token);
      } else {
        productTokens.push(token);
      }
    }
  }
  return { productTokens: uniqueStrings(productTokens), funderTokens: uniqueStrings(funderTokens) };
}

export function extractPastedTextSlots(rawText: string): PastedTextSlots {
  const normalizedText = normalizePastedText(rawText);
  const lines = normalizedText.split('\n').map((line) => line.trim()).filter(Boolean);
  const phones = extractPhones(normalizedText);
  const idCards = extractIdCards(normalizedText);
  const names = extractNames(lines, phones);
  const complaintContent = extractComplaintContent(normalizedText);
  const channelTokens = extractChannelTokens(lines);
  const { productTokens, funderTokens } = extractProductAndFunderTokens(lines);

  return {
    rawText,
    normalizedText,
    complaintContent,
    phones,
    idCards,
    names,
    channelTokens,
    productTokens,
    funderTokens,
  };
}
