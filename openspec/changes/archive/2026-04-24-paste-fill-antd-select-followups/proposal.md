## Why

粘贴填在真实工单页上暴露出 antd Select / Input 的交互细节：可搜索 Select 与无搜索 Select 不能同一套「灌字」策略；粘贴值通常完整准确，不能用宽松归一化把「端外客服反馈(自用)」误选成较短项。需要把这些行为写进规格，便于回归与后续迭代对齐。

## What Changes

- **Select 填充**：按运行时判断是否具备可输入搜索框（`showSearch` / 可见 search input / 展开下拉里可见搜索）决定「灌字搜索」或「打开下拉逐项匹配」。
- **选项文案匹配**：全局采用保留括号、禁止「目标更长却命中较短 option」的匹配规则；仍允许「目标较短、选项含完整目标」（如产品名 + 编码后缀）。
- **实现已落在代码库**（本 change 以补规格 + 归档追溯为主）；若与主 spec 有出入，以 delta spec 更新 `pasted-text-form-mapping` 行为描述。

## Capabilities

### New Capabilities

（无独立新能力域；行为归入粘贴映射与 content 填充。）

### Modified Capabilities

- `pasted-text-form-mapping`: 增补 Select 搜索/非搜索分支、严格选项匹配等可验收需求。

## Impact

- `src/content/antd-adapter.ts`（`fillSelect`、`selectTextMatches`、`selectSupportsSearchTyping` 等）
- `src/content/scanner.ts`（`extractLabel`，无 `<label>` 的 label 列等）
- `src/__tests__/failure-cases.test.ts` 等单测
- 主 spec：`openspec/specs/pasted-text-form-mapping/spec.md`（通过本 change 的 delta 对齐后由 `/opsx-archive` 或手动同步）
