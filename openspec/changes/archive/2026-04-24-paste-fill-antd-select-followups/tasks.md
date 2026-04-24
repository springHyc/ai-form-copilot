## 1. Content：Select 与选项匹配

- [x] 1.1 实现 `selectSupportsSearchTyping`，按 `showSearch` / 可见 search input / 展开下拉里可见搜索框分支灌字与等待策略
- [x] 1.2 将 `selectTextMatches` 改为保留括号、禁止较短 option 误命中；`fillSelect` 内选项循环与 `selectionOk`、`tryConfirmSelectByKeyboard` 使用统一匹配

## 2. 测试与构建

- [x] 2.1 补充 `failure-cases` / `paste-fill` 回归（无 showSearch 资金方、工单来源完整项等）
- [x] 2.2 `npm test` 与 `npm run build:content` 通过

## 3. OpenSpec 追溯（本会话）

- [x] 3.1 新建 change `paste-fill-antd-select-followups` 并补齐 proposal / design / delta spec / tasks
- [x] 3.2 主 spec `pasted-text-form-mapping`：产品→资金方两阶段与面包屑门控；CHANGELOG 条目；本 change 的 design / delta spec 对齐

## 4. 已撤回（不再实现）

- 「注册号码」填完后在 `FILL_FORM` 批次末尾额外模拟点击/失焦以触发 uid：扩展侧无法稳定等价手点，已从 `fillFormFields` 撤回；`scanner.extractLabel` 对无 `<label>` 的 label 列增强仍保留（扫描/展示用）。
