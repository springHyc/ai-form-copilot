import type { IssueCategoryNode } from '@/shared/types';

interface RawIssueNode {
  label?: string;
  value?: string;
  children?: RawIssueNode[];
}

const DEFAULT_ISSUE_TREE: IssueCategoryNode[] = [
  {
    label: '催收问题',
    value: '20',
    children: [
      {
        label: '催收问题',
        value: '419',
        children: [
          {
            label: '咨询催收问题',
            value: '1462',
            children: [
              { label: '已逾期协商还款', value: 'CS0101' },
            ],
          },
          {
            label: '投诉催收',
            value: '1433',
            children: [
              { label: '催收态度', value: '1465' },
              { label: '联系紧急联系人', value: '1101' },
              { label: '联系非紧急联系人的其他人', value: '1102' },
            ],
          },
        ],
      },
    ],
  },
];

let cachedTree: IssueCategoryNode[] | null = null;
let cachedKey = '';

function normalizeNode(raw: RawIssueNode): IssueCategoryNode | null {
  const label = (raw.label ?? '').trim();
  const value = String(raw.value ?? '').trim();
  if (!label || !value) return null;
  const normalizedChildren = (raw.children ?? [])
    .map((child) => normalizeNode(child))
    .filter((child): child is IssueCategoryNode => Boolean(child));
  return {
    label,
    value,
    children: normalizedChildren.length > 0 ? normalizedChildren : undefined,
  };
}

export function parseAndCacheIssueTree(input?: IssueCategoryNode[] | string): IssueCategoryNode[] {
  if (!input) return DEFAULT_ISSUE_TREE;

  const cacheKey = typeof input === 'string' ? input : JSON.stringify(input);
  if (cachedTree && cachedKey === cacheKey) return cachedTree;

  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    if (!Array.isArray(parsed)) return DEFAULT_ISSUE_TREE;
    const normalized = parsed
      .map((node) => normalizeNode(node as RawIssueNode))
      .filter((node): node is IssueCategoryNode => Boolean(node));
    if (normalized.length === 0) return DEFAULT_ISSUE_TREE;
    cachedKey = cacheKey;
    cachedTree = normalized;
    return normalized;
  } catch {
    return DEFAULT_ISSUE_TREE;
  }
}
