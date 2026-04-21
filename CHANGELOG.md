# Changelog

本文件记录 AI Form Copilot 的重要变更。

## [0.1.1] - 2026-04-21

### 修复

- **Mock 规则**：修正 label 关键词匹配顺序。像「渠道代码（企业金融）」会因括号内的「企业」先命中公司名规则而生成中文公司名；现将「编号 / 编码 / 代码 / …」等编码类规则排在「公司 | 企业」之前，并补充 `代码` 及常见「xxx码」词组，避免误用 `randomCompany()`。
- **Mock 规则**：`wantsAlphanumeric` 识别 antd 常见文案（如「字母或数字」「请输入字母数字」等），在 hints / 校验回灌场景下优先生成字母数字串。

### 改进

- **一键填充**：待处理字段除「无值」外，包含「已有值但页面展示校验错误」的项（如 pattern 不通过），以便第二轮扫描后重新生成并填充；移除「本轮填充数达标即立刻结束」的过早退出，与上述逻辑一致。
- **扫描**：`extractValidationError` 在无 `.ant-form-item-explain-error` 文案时，若存在 `ant-form-item-has-error`，尝试读取 `.ant-form-item-explain-connected`，否则兜底为「校验未通过」，减少漏检。
- **AI 生成**：在 prompt 规则中明确「请输入字母或数字」表示仅英文字母与数字、不得中文，降低 AI 模式下的同类校验失败。
