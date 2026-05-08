## Context

粘贴填通过 content `fillFormFields` 驱动 antd 表单；antd@4 Select 存在可搜索与不可搜索、portal 下拉、受控值与 DOM 展示不一致等问题。粘贴文本中的封闭选项值通常完整准确。

## Goals / Non-Goals

**Goals:**

- 运行时区分 Select 是否具备可输入搜索能力，再决定灌字或逐项点选。
- 选项与目标文案匹配时避免「较长目标命中较短 option」的截断误选。

**Non-Goals:**

- 不承诺覆盖非 antd/rc-select 的自定义下拉实现细节。
- 不修改业务接口与后端契约。

## Decisions

1. **`selectSupportsSearchTyping`**：`ant-select-show-search` 类名，或选择器内 / 已展开未隐藏下拉中 **可见且未 disabled** 的 search input；否则不调用 `tryTypeSelectSearch`。
2. **`selectTextMatches`**：规范化保留括号与中划线等；仅允许全等或「option 含完整 target 且 option 规范化长度 ≥ target」；移除旧版去括号 + `target.includes(shorterOption)` 的宽松路径。
3. **单测**：`failure-cases` / `paste-fill` 覆盖无 showSearch Select、工单来源截断否定等。
4. **粘贴填：产品→资金方两阶段门控**：仅当 content 侧命中「客服管理系统 + 客诉管理 +（工单详情 \| 新增工单 \| 新建工单）」可见 antd 面包屑时，`paste-fill-handler` 才在首阶段 `includeFunder: false` 并随后 `WAIT_LINKED_FIELDS` 再填资金方；否则单次 `includeFunder: true` 映射填充，避免出现「第一阶段跳过资金方，等待产品联动」之专页语义。门控实现与 `src/content/cs-complaint-ticket-page.ts` 一致；Background 通过 `PASTE_FILL_PAGE_CONTEXT` / `PASTE_FILL_PAGE_CONTEXT_RESULT`（`src/shared/messages.ts`）在填表前查询。

## Risks / Trade-offs

- **[Risk]** 个别页面用隐藏但可聚焦的 search input 误判为可搜索 → 仍尝试灌字。  
  **→ Mitigation** 以 `isVisible` 过滤；类名 `ant-select-show-search` 优先。
- **[Risk]** 选项虚拟列表未挂载完全项 → 逐项匹配仍可能漏项。  
  **→ Mitigation** 保留等待循环与重开下拉；与既有异步 Select 策略一致。

## Migration Plan

扩展重载 content script；无需数据迁移。

## Open Questions

无。
