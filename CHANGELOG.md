# Changelog

本文件记录 AI Form Copilot 的重要变更。

## [0.1.2] - 2026-04-21

### 修复

- **扫描（Select）**：已选值兼容 antd 4 `.ant-select-selection-selected-value`（与下方 Select 填充配套）。
- **Mock**：无 `options` 的 **select**（异步下拉，如「资金方」）兜底 **`random`**；**手机|电话** 规则排在 **姓名|…|处理人** 之前，避免「处理人手机号」被误当成中文名。（渠道代码、`wantsAlphanumeric` 等见 **0.1.1**。）
- **Mock / AI（通用字符集）**：扫描读取 `input`/`textarea` 的 HTML `pattern` 写入 `constraints.pattern`；支持 `data-ai-pattern` / `data-pattern` 等（rules 不落 DOM 时由业务挂载）；Mock 支持无 `^$` 的纯 `[...]+` 形态；中文「只能包含…」枚举仍用于回灌。**校验文案**：显式匹配 `.ant-form-item-explain-connected`、`[role="alert"]` 内层 `.ant-form-item-explain-error`（外圈 flex 包裹仍属表单项子树时可直接命中）；若错误区仅在 `document.getElementById(aria-describedby)` 可及（与控件不同子树），在 `has-error` / `aria-invalid` 时同样解析。
- **Select 填充**：兼容 antd 4 / 5+ / `.rc-select-dropdown`；`simulatePointerClick`；下拉可见性修正（含 `opacity:''` 误判）；`[role="option"]`、`.ant-select-item-option-content`。Cascader / TreeSelect 打开方式一致。
- **AI 生成**：select 未列出可选值时须返回 **`random`**。（其余 AI / 一键填充 / 校验 DOM 见 **0.1.1**。）

### 改进

- **Popup**：AI 鉴权失败（如 401、密钥无效）时提示「AI 大模型调用失败，请检查你的AI配置」，替代冗长英文报错。

### 测试

- `src/__tests__/marketing-plan-failure-cases.test.ts`（Vitest + jsdom）：营销计划回归、失败案例 6（渠道代码）、失败案例 7（antd 4/5 Select 填充）、**截图「新增处理人」**（双异步 Select；`disabled` + placeholder；`fillInput` 跳过禁用框）、失败案例 8（`pattern` /「只能包含…」Mock）、**短链类红字 DOM**（`explain-connected` + `role="alert"` + 内层 `explain-error`；`aria-describedby` 指向表单项外 `#*_help`）、`data-ai-pattern` 扫描、antd 4 仅 `.ant-form-item-explain`。运行：`npm test`。

## [0.1.1] - 2026-04-21

### 修复

- **Mock 规则**：修正 label 关键词匹配顺序。像「渠道代码（企业金融）」会因括号内的「企业」先命中公司名规则；现将「编号 / 编码 / 代码 / …」等编码类规则排在「公司 | 企业」之前，并补充 `代码` 及常见「xxx码」词组。
- **Mock 规则**：`wantsAlphanumeric` 识别 antd 常见文案（如「字母或数字」「请输入字母数字」等）。

### 改进

- **一键填充**：待处理字段除「无值」外，包含「已有值但页面展示校验错误」的项；移除「本轮填充数达标即立刻结束」的过早退出。
- **扫描**：`extractValidationError` 在无标准 error 节点时，结合 `ant-form-item-has-error` / `explain-connected` 兜底。
- **AI 生成**：prompt 中明确「请输入字母或数字」= 仅英文字母与数字、不得中文。
