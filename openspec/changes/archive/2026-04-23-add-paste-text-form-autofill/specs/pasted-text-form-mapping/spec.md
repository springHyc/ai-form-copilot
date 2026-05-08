## ADDED Requirements

### Requirement: System SHALL map pasted free text to form fields conservatively
系统 MUST 支持用户粘贴单段自由文本，并将文本解析为字段候选后映射到表单字段。对低置信字段，系统 MUST 留空而非强制填充。

#### Scenario: Conservative mapping leaves uncertain fields empty
- **WHEN** 用户粘贴的文本无法高置信匹配某个目标字段
- **THEN** 系统不填充该字段，并保留给人工补录

### Requirement: System SHALL apply single-phone dual-fill rule
当粘贴文本中仅识别到一个合法手机号时，系统 MUST 同时填充 `来电号码` 与 `注册号码` 为同一号码。

#### Scenario: One phone number fills both phone fields
- **WHEN** 文本中仅提取到一个合法手机号
- **THEN** `来电号码` 与 `注册号码` 均被填充为该手机号

### Requirement: System SHALL match closed-option fields by legal options only
对于 `工单来源`、`端口`、`产品名称`、`资金方` 等封闭选项字段，系统 MUST 仅在命中当前字段合法选项时填充；未命中时 MUST 留空。

#### Scenario: Closed-option field is skipped when no legal option matches
- **WHEN** 候选值无法匹配字段可选项
- **THEN** 系统不选择任何选项，并记录该字段为未自动填充

### Requirement: System SHALL fill linked fields in staged order
存在联动关系的字段 MUST 按阶段填充：先填上游字段（`产品名称`），等待联动渲染后再尝试下游字段（`资金方`）。

#### Scenario: Funder field is attempted only after product is selected
- **WHEN** `产品名称` 成功命中并完成选择
- **THEN** 系统等待联动更新后再尝试匹配并填充 `资金方`
