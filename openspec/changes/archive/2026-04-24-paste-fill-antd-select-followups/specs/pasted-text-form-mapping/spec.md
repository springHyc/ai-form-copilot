## ADDED Requirements

### Requirement: System SHALL fill product-to-funder linkage in staged order only on CS complaint ticket pages
对「`产品名称` → `资金方`」依赖联动渲染的粘贴文本填充，系统 MUST 仅在**客服/客诉工单面包屑语境**下采用两阶段策略：先映射并填充上游（含 `产品名称` 等），首阶段映射 MAY 将 `资金方` 记为留空并附原因「第一阶段跳过资金方，等待产品联动」；随后 MUST 等待联动字段就绪后再单独尝试 `资金方` 的映射与填充。

面包屑语境判定 MUST 以页面内可见 antd 面包屑（如 `nav.ant-breadcrumb` / `.ant-breadcrumb`）文案为准：同时包含「客服管理系统」「客诉管理」，且末级路径包含「工单详情」「新增工单」「新建工单」之一；**MUST NOT** 仅依赖 `document.title` 作为模块路径依据。

#### Scenario: On ticket breadcrumb page, funder is attempted after product and linkage wait
- **WHEN** 当前页满足上述客服/客诉工单面包屑语境，且粘贴文本中含可匹配的 `产品名称` 与 `资金方` 候选
- **THEN** 系统先完成含 `产品名称` 在内的首阶段填充，等待联动后再尝试匹配并填充 `资金方`，且首阶段映射 MAY 出现「第一阶段跳过资金方，等待产品联动」之说明

#### Scenario: On other pages, funder is mapped like any closed-option field in one pass
- **WHEN** 当前页不满足上述面包屑语境
- **THEN** 系统 MUST 在同一映射与填充轮次中处理 `资金方`（与 `工单来源` / `端口` / `产品名称` 等封闭选项一致），MUST NOT 采用首阶段刻意跳过资金方再等待联动的两阶段策略，且 MUST NOT 将「第一阶段跳过资金方，等待产品联动」作为该页的留空原因

### Requirement: System SHALL choose Select search vs list matching by runtime capability

对 antd/rc Select 的自动点选，系统 MUST 在填充前根据当前 DOM 判断是否可对搜索框输入：若根节点带 `showSearch` 语义（如 `ant-select-show-search` 类）或存在可见且可用的搜索 `input`，则 MAY 通过输入目标文案缩小选项；否则 MUST 依赖打开下拉后的可见选项列表逐项匹配，且 MUST NOT 仅依赖不存在的搜索输入灌字。

#### Scenario: Non-searchable select uses list iteration

- **WHEN** 目标 Select 无可用的可见搜索输入且未声明 `showSearch`
- **THEN** 系统不依赖 `tryTypeSelectSearch` 灌字，而在展开的下拉里按选项文案匹配并点选

#### Scenario: Searchable select may type to filter

- **WHEN** 目标 Select 具备 `showSearch` 或可见搜索输入
- **THEN** 系统 MAY 向搜索框写入目标文案以过滤选项，并仍 MUST 通过点选 menu-item 等方式提交受控选中值

### Requirement: System SHALL match Select option text without truncated false positives

对显式目标值（非 `random`）与下拉选项文案的匹配，系统 MUST 使用保留括号等关键结构的规范化规则；允许全等，或「选项文案包含完整目标且选项规范化后不短于目标」（以支持「目标为简称、选项带编码后缀」）；系统 MUST NOT 因「目标规范化串包含较短选项串」而选中较短、截断后的选项（例如目标为 `端外客服反馈(自用)` 时不得仅选 `端外客服反馈`）。

#### Scenario: Full parenthetical label wins over shorter prefix option

- **WHEN** 下拉中同时存在较短选项与含完整括号语义的较长选项，且粘贴目标为较长完整串
- **THEN** 系统选中与完整目标一致的选项，不选中仅前缀一致的较短项
