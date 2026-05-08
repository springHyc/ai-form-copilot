import type { IssueCategoryNode, IssueClassificationResult, PastedTextSlots } from '@/shared/types';

function compactText(text: string): string {
  return text.replace(/\s+/g, '');
}

function findChildByLabel(parent: IssueCategoryNode | undefined, target: string): IssueCategoryNode | undefined {
  return parent?.children?.find((node) => node.label.includes(target));
}

function chooseL3Label(content: string): '投诉催收' | '咨询催收问题' {
  const compact = compactText(content);
  const consultHits = [
    /协商还款/,
    /停催/,
    /已答应/,
    /请执行/,
    /减免/,
    /资金困难/,
  ].filter((re) => re.test(compact)).length;
  const complaintHits = [
    /暴力催收/,
    /态度/,
    /泄露/,
    /骚扰/,
    /第三方/,
    /家人朋友/,
    /紧急联系人/,
  ].filter((re) => re.test(compact)).length;
  return consultHits > complaintHits ? '咨询催收问题' : '投诉催收';
}

function chooseL4Label(content: string, l3Label: string): {
  label?: string;
  confidence: number;
  conflict: boolean;
} {
  const compact = compactText(content);
  if (l3Label === '咨询催收问题') {
    if (/协商还款|停催|已答应|请执行|减免|资金困难/.test(compact)) {
      return { label: '已逾期协商还款', confidence: 0.86, conflict: false };
    }
    return { confidence: 0.58, conflict: false };
  }

  const emergency = /家人朋友|紧急联系人|联系家人|联系亲友/.test(compact);
  const attitude = /暴力催收|催收态度|威胁|骚扰|泄露欠款|违规催收/.test(compact);
  if (emergency && attitude) return { confidence: 0.61, conflict: true };
  if (emergency) return { label: '联系紧急联系人', confidence: 0.88, conflict: false };
  if (attitude) return { label: '催收态度', confidence: 0.84, conflict: false };
  return { confidence: 0.56, conflict: false };
}

export function classifyIssueByHierarchy(
  slots: PastedTextSlots,
  issueTree: IssueCategoryNode[],
): IssueClassificationResult {
  const root = issueTree.find((node) => node.label.includes('催收问题'));
  if (!root) {
    return { pathLabels: [], pathValues: [], stoppedAtLevel: 0, confidence: 0, reason: '未找到催收问题根节点' };
  }

  const l2 = findChildByLabel(root, '催收问题');
  const pathLabels = [root.label];
  const pathValues = [root.value];
  if (!l2) {
    return { pathLabels, pathValues, stoppedAtLevel: 1, confidence: 0.72, reason: '仅确定到一级' };
  }
  pathLabels.push(l2.label);
  pathValues.push(l2.value);

  const l3Label = chooseL3Label(slots.complaintContent);
  const l3 = findChildByLabel(l2, l3Label);
  if (!l3) {
    return { pathLabels, pathValues, stoppedAtLevel: 2, confidence: 0.74, reason: '三级节点缺失' };
  }
  pathLabels.push(l3.label);
  pathValues.push(l3.value);

  const l4Choice = chooseL4Label(slots.complaintContent, l3.label);
  if (!l4Choice.label || l4Choice.conflict) {
    return {
      pathLabels,
      pathValues,
      stoppedAtLevel: 3,
      confidence: l4Choice.conflict ? 0.62 : l4Choice.confidence,
      reason: l4Choice.conflict ? '四级叶子冲突，保守停在三级' : '四级置信不足',
    };
  }

  const l4 = findChildByLabel(l3, l4Choice.label);
  if (!l4) {
    return { pathLabels, pathValues, stoppedAtLevel: 3, confidence: 0.71, reason: '四级节点不存在于合法树' };
  }

  pathLabels.push(l4.label);
  pathValues.push(l4.value);
  return { pathLabels, pathValues, stoppedAtLevel: 4, confidence: l4Choice.confidence };
}
