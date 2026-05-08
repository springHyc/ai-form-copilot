import { describe, expect, it } from 'vitest';
import type { FormFieldInfo, IssueCategoryNode } from '@/shared/types';
import { buildPastedTextMappingPlan } from '@/paste-fill/field-mapper';
import { extractPastedTextSlots } from '@/paste-fill/text-slots';

const ISSUE_TREE: IssueCategoryNode[] = [
  {
    label: '催收问题',
    value: '20',
    children: [
      {
        label: '催收问题',
        value: '419',
        children: [
          {
            label: '投诉催收',
            value: '1433',
            children: [
              { label: '催收态度', value: '1465' },
              { label: '联系紧急联系人', value: '1101' },
            ],
          },
          {
            label: '咨询催收问题',
            value: '1462',
            children: [{ label: '已逾期协商还款', value: 'CS0101' }],
          },
        ],
      },
    ],
  },
];

describe('粘贴文本抽取', () => {
  it('可抽取手机号、客诉正文和渠道 token', () => {
    const slots = extractPastedTextSlots(`
耿磊 13718099399
客诉内容：用户表示已对公还款，仍被暴力催收
端外客服反馈(自用) 、端内-榕树
乐通分期 、华章-海尔消金
`);
    expect(slots.phones).toEqual(['13718099399']);
    expect(slots.complaintContent).toContain('仍被暴力催收');
    expect(slots.channelTokens.length).toBeGreaterThan(0);
    expect(slots.productTokens).toContain('乐通分期');
    expect(slots.funderTokens).toContain('华章-海尔消金');
  });
});

describe('手机号硬规则', () => {
  it('只有一个手机号时同时填来电号码和注册号码', () => {
    const fields: FormFieldInfo[] = [
      { id: 'field_0', label: '来电号码', type: 'input', required: true },
      { id: 'field_1', label: '注册号码', type: 'input', required: true },
    ];
    const plan = buildPastedTextMappingPlan(fields, '张三 13718099399 客诉内容：暴力催收');
    expect(plan.data.field_0).toBe('13718099399');
    expect(plan.data.field_1).toBe('13718099399');
  });
});

describe('问题分类分层', () => {
  it('叶子冲突时保守停在三级', () => {
    const fields: FormFieldInfo[] = [
      { id: 'field_9', label: '问题类型&分类', type: 'cascader', required: true },
    ];
    const plan = buildPastedTextMappingPlan(
      fields,
      '客户投诉暴力催收并联系家人朋友，要求停止催收',
      { issueTree: ISSUE_TREE },
    );
    expect(plan.classification?.stoppedAtLevel).toBe(3);
    expect(String(plan.data.field_9)).toBe('催收问题 > 催收问题 > 投诉催收');
  });

  it('协商还款语义可命中四级叶子', () => {
    const fields: FormFieldInfo[] = [
      { id: 'field_9', label: '问题类型&分类', type: 'cascader', required: true },
    ];
    const plan = buildPastedTextMappingPlan(
      fields,
      '客户资金困难，已答应停催1个月，申请协商还款',
      { issueTree: ISSUE_TREE },
    );
    expect(plan.classification?.stoppedAtLevel).toBe(4);
    expect(String(plan.data.field_9)).toBe('催收问题 > 催收问题 > 咨询催收问题 > 已逾期协商还款');
  });
});

describe('显式键值文本映射', () => {
  it('工单来源/端口/产品/资金方在无 options 快照时仍会按显式键值尝试填充', () => {
    const fields: FormFieldInfo[] = [
      { id: 'f1', label: '工单来源', type: 'select', required: true },
      { id: 'f2', label: '端口', type: 'select', required: true },
      { id: 'f3', label: '产品名称', type: 'select', required: true },
      { id: 'f4', label: '资金方', type: 'select', required: true },
    ];

    const plan = buildPastedTextMappingPlan(
      fields,
      '工单来源：端外客服反馈(自用) 端口：端内-榕树 产品名称：乐通分期 资金方：昊悦-长银',
      { issueTree: ISSUE_TREE, includeFunder: true },
    );

    expect(plan.data.f1).toBe('端外客服反馈(自用)');
    expect(plan.data.f2).toBe('端内-榕树');
    expect(plan.data.f3).toBe('乐通分期');
    expect(plan.data.f4).toBe('昊悦-长银');
  });
});
