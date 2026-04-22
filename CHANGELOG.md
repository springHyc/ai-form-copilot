# Changelog

本文件记录 AI Form Copilot 的重要变更。

## [0.1.2] - 2026-04-21

### 修复

- **扫描（Select）**：已选值兼容 antd 4 `.ant-select-selection-selected-value`（与下方 Select 填充配套）。
- **Mock**：无 `options` 的 **select**（异步下拉，如「资金方」）兜底 **`random`**；**手机|电话** 规则排在 **姓名|…|处理人** 之前，避免「处理人手机号」被误当成中文名。（渠道代码、`wantsAlphanumeric` 等见 **0.1.1**。）
- **Mock / AI（通用字符集）**：扫描读取 `input`/`textarea` 的 HTML `pattern` 写入 `constraints.pattern`；支持 `data-ai-pattern` / `data-pattern` 等（rules 不落 DOM 时由业务挂载）；Mock 支持无 `^$` 的纯 `[...]+` 形态；中文「只能包含…」枚举仍用于回灌。**校验文案**：显式匹配 `.ant-form-item-explain-connected`、`[role="alert"]` 内层 `.ant-form-item-explain-error`（外圈 flex 包裹仍属表单项子树时可直接命中）；若错误区仅在 `document.getElementById(aria-describedby)` 可及（与控件不同子树），在 `has-error` / `aria-invalid` 时同样解析。
- **Mock / DatePicker（日期时间）**：Mock 用本地近期日 + 整半点（:00/:30）以贴合常见 disabledDate/disabledTime；单选填充以本机「今天」为锚向前后试探首个非禁选日，再按字符串落时分并兼容 antd@4 下拉与时间列；日期类 Mock/范围亦统一本地 YMD；AI 规则侧重近期日更易对上 disabled。
- **扫描 / 填充（TimePicker）**：同一 `Form.Item` 内 **Select + ProFormTimePicker**（如 jarvis 营销计划「执行时间」）原先只命中 `.ant-select` 会漏掉时刻框；现增加类型 **time**，扫描追加第二字段、Mock 生成 **HH:mm:ss**、`fillTimePicker` 点选时间列；AI 规则 11 说明纯时刻格式。
- **扫描 / 填充（同项多控件通用化）**：后台常见「一个 `Form.Item` 里多个 Pro 子项」不再按「主类型 + 特判」硬编码，改为统一枚举 `.ant-form-item-control` 下的控件，按 **文档序** 产出 `radio / number / time / date...`，label 后缀走通用 **`（2）`、`（3）`**，`fillFormFields` 按同类型序号（`typeOccurrence`）分别回填。修掉一个回归：**`Radio.Group` 内条件渲染的 `ProFormDigit / ProFormDateTimePicker`**（如 jarvis 营销计划「解除隔离规则」`FirstStep.tsx:569-668`）此前被 `.ant-radio-group` 通过「包含即去重」吞掉导致漏扫漏填；现去重仅对**复合控件**（`cascader / treeselect / transfer`）生效，`radio-group / checkbox-group / picker` 不再吞子字段。
- **Mock / 填充（RangePicker + showTime）**：new-market 榕树运营管理系统「首页弹窗-有效时间」`<RangePicker showTime={{ format: 'HH:mm:ss' }} format='YYYY-MM-DD HH:mm:ss' />`（`add-info.tsx:360-362`）此前只填上年月日、时分秒全丢，页面仍提示「请选择有效时间」。根因：`fillDateRange` 直写路径把 value 截成 `YYYY-MM-DD`，下拉路径点完日期也没走时间列 + OK。现改为：Mock `randomDateRange` 直接生成 `YYYY-MM-DD HH:mm:ss,YYYY-MM-DD HH:mm:ss`（分钟仅 00/30，时段 10–17）；`fillDateRange` 先打开面板逐日点选，出现 `.ant-picker-time-panel` / `.ant-picker-ok` 即为 `showTime`，追加 `tryPickTimeInDropdown` + `confirmPickerIfNeeded`（开始/结束各一次）；AI 规则 6 同步补充 daterange 的带时分秒格式。
- **Mock（Select 家族不走 label 文本规则）**：jarvis 营销计划「提额机构pid」（`FirstStep.tsx:291-298`）被 `LABEL_RULES` 的 `/id|编号|…/` 命中 → `randomCode()` 产出 `ZWOAO19`，与异步 options（`10648/小花钱包API` 等）对不上、`fillSelect` 填不进。修复：`select / cascader / treeselect / transfer` 四类在 `LABEL_RULES` 之前短路 —— 有 options 就 `pickOne`，无 options 统一 `"random"` 交给 `fillSelect` 在真实下拉里随机点选；「处理人姓名」等异步 select 同理不再误配中文名。
- **填充（RangePicker `format` 推断）**：`buoy-deploy/add-info.tsx:383-385` 的 `<RangePicker format='YYYY-MM-DD' placeholder={['开始时间','结束时间']} />` 被上一条误判为 showTime，`HH:mm:ss` 写入后 rc-picker parse 失败、整段日期落不上。`format` 不落 DOM，改用 **`input.size`** 反推（antd@5 rc-picker 约等于 `format.length`：`YYYY-MM-DD`→`size=12`、`YYYY-MM-DD HH:mm:ss`→`size=21`，阈值 `>=15`），次选 `value` 含 `HH:mm` 或 placeholder 明确 `HH:mm / 时分秒`；「开始/结束时间」不再作为 showTime 信号。
- **Select 填充**：兼容 antd 4 / 5+ / `.rc-select-dropdown`；`simulatePointerClick`；下拉可见性修正（含 `opacity:''` 误判）；`[role="option"]`、`.ant-select-item-option-content`。Cascader / TreeSelect 打开方式一致。
- **AI 生成**：select 未列出可选值时须返回 **`random`**。（其余 AI / 一键填充 / 校验 DOM 见 **0.1.1**。）

### 改进

- **Popup**：AI 鉴权失败（如 401、密钥无效）时提示「AI 大模型调用失败，请检查你的AI配置」，替代冗长英文报错。
- **测试文件重命名**：`src/__tests__/marketing-plan-failure-cases.test.ts` → `src/__tests__/failure-cases.test.ts`（`git mv` 保留历史）。文件已从「营销计划单页回归」扩成 scan / mock / fill / popup 四侧失败案例合集，`README.md`、`CHANGELOG.md`、`.cursor/skills/ai-form-failure-case/SKILL.md` 的引用路径同步更新。
- **文档拆分**：`README.md` 改为**使用文档**（功能、安装 zip / 源码、用法、AI 设置、组件支持表、反馈入口）；新增 **`DEVELOPMENT.md`** 承载技术栈、源码构建、项目结构、实现原理、测试、`build:prod*` / `pack:dist` / `publish:tag` 发版流程及失败案例模板；两份文档互链，避免用户与贡献者混读。
- **AI**：设置增智谱/百炼/MiniMax/方舟/硅基/百川（`AiProvider` + 默认 Base）；Kimi 增 `kimi-k2.6` 且与 K2.5 同走 `/anthropic`；DeepSeek 下拉标 V3.2；MiniMax 省略 `response_format`；README / DEVELOPMENT 同步。
- **发版**：`DEVELOPMENT.md` 写明 `pack:dist` 后再 `git push` / `git push origin tag`；`publish-tag.mjs` 推送前打日志。

### 测试

- `src/__tests__/failure-cases.test.ts`（Vitest + jsdom）：失败案例回归合集（原 `marketing-plan-failure-cases.test.ts`）—— 营销计划回归、失败案例 6（渠道代码）、失败案例 7（antd 4/5 Select 填充）、**截图「新增处理人」**（双异步 Select；`disabled` + placeholder；`fillInput` 跳过禁用框）、失败案例 8（`pattern` /「只能包含…」Mock）、**短链类红字 DOM**（`explain-connected` + `role="alert"` + 内层 `explain-error`；`aria-describedby` 指向表单项外 `#*_help`）、`data-ai-pattern` 扫描、antd 4 仅 `.ant-form-item-explain`、失败案例 9（new-market RangePicker + showTime）。运行：`npm test`。

## [0.1.1] - 2026-04-21

### 修复

- **Mock 规则**：修正 label 关键词匹配顺序。像「渠道代码（企业金融）」会因括号内的「企业」先命中公司名规则；现将「编号 / 编码 / 代码 / …」等编码类规则排在「公司 | 企业」之前，并补充 `代码` 及常见「xxx码」词组。
- **Mock 规则**：`wantsAlphanumeric` 识别 antd 常见文案（如「字母或数字」「请输入字母数字」等）。

### 改进

- **一键填充**：待处理字段除「无值」外，包含「已有值但页面展示校验错误」的项；移除「本轮填充数达标即立刻结束」的过早退出。
- **扫描**：`extractValidationError` 在无标准 error 节点时，结合 `ant-form-item-has-error` / `explain-connected` 兜底。
- **AI 生成**：prompt 中明确「请输入字母或数字」= 仅英文字母与数字、不得中文。
