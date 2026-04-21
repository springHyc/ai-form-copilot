# Changelog

本文件记录 AI Form Copilot 的重要变更。

## [0.1.2] - 2026-04-21

### 修复

- **扫描（Select）**：已选值兼容 antd 4 `.ant-select-selection-selected-value`（与下方 Select 填充配套）。
- **Mock**：无 `options` 的 **select**（异步下拉，如「资金方」）兜底 **`random`**；**手机|电话** 规则排在 **姓名|…|处理人** 之前，避免「处理人手机号」被误当成中文名。（渠道代码、`wantsAlphanumeric` 等见 **0.1.1**。）
- **Select 填充**：兼容 antd 4 / 5+ / `.rc-select-dropdown`；`simulatePointerClick`；下拉可见性修正（含 `opacity:''` 误判）；`[role="option"]`、`.ant-select-item-option-content`。Cascader / TreeSelect 打开方式一致。
- **AI 生成**：select 未列出可选值时须返回 **`random`**。（其余 AI / 一键填充 / 校验 DOM 见 **0.1.1**。）

### 测试

- `src/__tests__/marketing-plan-failure-cases.test.ts`（Vitest + jsdom）：营销计划回归、失败案例 6（渠道代码）、失败案例 7（antd 4/5 Select 填充）、**截图「新增处理人」**（对齐 `new-apple/.../repayment-handler/drawer.tsx`：双异步 Select；**处理人手机号** `disabled` + 联动 placeholder；`fillInput` 跳过禁用框）。运行：`npm test`。

## [0.1.1] - 2026-04-21

### 修复

- **Mock 规则**：修正 label 关键词匹配顺序。像「渠道代码（企业金融）」会因括号内的「企业」先命中公司名规则；现将「编号 / 编码 / 代码 / …」等编码类规则排在「公司 | 企业」之前，并补充 `代码` 及常见「xxx码」词组。
- **Mock 规则**：`wantsAlphanumeric` 识别 antd 常见文案（如「字母或数字」「请输入字母数字」等）。

### 改进

- **一键填充**：待处理字段除「无值」外，包含「已有值但页面展示校验错误」的项；移除「本轮填充数达标即立刻结束」的过早退出。
- **扫描**：`extractValidationError` 在无标准 error 节点时，结合 `ant-form-item-has-error` / `explain-connected` 兜底。
- **AI 生成**：prompt 中明确「请输入字母或数字」= 仅英文字母与数字、不得中文。
