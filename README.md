# AI Form Copilot

智能表单填充浏览器插件 —— 自动识别 Ant Design 表单并生成合规测试数据，面向后台系统的开发、测试、产品同学，一键把一整页表单填上。

> 想看实现原理 / 从源码构建 / 发版流程？请跳转 [DEVELOPMENT.md](./DEVELOPMENT.md)。

## 功能特性

- **表单自动扫描**：自动识别页面中的 Ant Design 表单字段（Input / Textarea / Select / Radio / Checkbox / DatePicker / RangePicker / TimePicker / InputNumber / Cascader / TreeSelect / Switch / Transfer 等 14 类）。
- **AI 智能生成**：接入 OpenAI / DeepSeek / 任意 OpenAI 兼容接口，依据字段标签、placeholder、校验规则生成贴合语义的中文测试数据。
- **内置 Mock 规则**：不配 AI 也能直接用，基于关键词的规则覆盖姓名、手机、邮箱、身份证、地址、公司、日期、时间、金额、编号等常见字段，并能从 HTML `pattern` / 中文「只能包含…」提示里反解字符集。
- **一键填充**：「扫描 → 生成 → 填充」三步合一，也能分步执行便于逐步观察。
- **多轮纠偏**：填错后会读取红色校验文案（`.ant-form-item-explain-error` / `role=alert` 等）回灌到下一轮生成，自动重填直到通过。
- **Pro Components / React 受控组件适配**：支持 `@ant-design/pro-components`（ProFormText / ProFormSelect / ProFormDateRangePicker…），绕过 React 受控 `input.value` 劫持正确触发 `onChange`。
- **兼容 antd 4 / 5+**：同时覆盖两种主版本的 DOM 形态（`.ant-select-selection` vs `.ant-select-selector`、`.ant-select-dropdown-menu-item` vs `.ant-select-item-option` 等）。

## 安装

### 方式 1：下载已构建的 zip（推荐）

1. 到 [releases/ 目录](https://gitlab-hlw.shuqudata.com/bairong/ai-form-copilot/-/tree/main/releases) 下载最新的 `ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip`。
2. 解压到任意本地目录（确认目录里有 `manifest.json`）。
3. 打开 Chrome，访问 `chrome://extensions/`，开启右上角「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择第 2 步解压出来的整个文件夹。

### 方式 2：从源码构建

本地跑 `npm install && npm run build`，然后加载 `dist/` 目录。详细步骤见 [DEVELOPMENT.md](./DEVELOPMENT.md#从源码构建)。

## 使用方法

1. 打开包含 Ant Design 表单的页面。
2. 点击浏览器工具栏中的 AI Form Copilot 图标，弹出 Popup。
3. 点「一键智能填充」一步到位；或分步操作：
   - **扫描**：列出页面上识别到的所有字段（含标签、类型、必填、当前值、校验错误）。
   - **生成数据**：按当前配置（Mock / AI）生成一份数据，在 Popup 预览。
   - **填充**：把生成值写回表单，并返回「本轮成功填充字段数」。
4. 若提交后页面出现红色校验错误，再点一次「一键智能填充」，插件会自动把错误文案回灌到下一轮生成，直到通过。

## 配置 AI（可选）

切到 Popup 右上角的「设置」选项卡即可：

- **OpenAI**：填入 API Key，选择模型（推荐 `gpt-4o-mini`，质量 / 费用 / 速度平衡好）。
- **DeepSeek**：填入 API Key，API 地址会自动指向 `https://api.deepseek.com`。
- **自定义**：可配置任何 OpenAI 兼容的 API 接口（同时支持公司内网的模型网关）。

> 不配 API Key 时，插件会使用内置的 Mock 规则生成数据，对常见字段（姓名、手机、邮箱、身份证、地址、日期、金额、编号等）已有良好支持。AI 主要在「业务专属字段」（如「营销计划名称」「隔离设置」「渠道代码」等需要理解语义才能填对的字段）上显著提升数据质量。

## 支持的 Ant Design 组件

> 同时覆盖 antd 原生组件和 `@ant-design/pro-components`（ProFormText / ProFormSelect / ProFormDateRangePicker…）。

### 已支持（14 类）

| 组件                     | 类型       | 扫描识别 | 自动填充 | 填充策略                                                                      |
| ------------------------ | ---------- | -------- | -------- | ----------------------------------------------------------------------------- |
| Input 输入框             | input      | ✅       | ✅       | 通过原生 `valueSetter` 设值 + 派发 `input`/`change` 事件，绕过 React 受控组件 |
| Input.TextArea 文本域    | textarea   | ✅       | ✅       | 同 Input                                                                      |
| Input.Password 密码框    | input      | ✅       | ✅       | 通过 `.ant-input-affix-wrapper` 识别，填充策略同 Input                        |
| InputNumber 数字输入框   | number     | ✅       | ✅       | 操作 `.ant-input-number-input` 内部 input                                     |
| Select 选择器            | select     | ✅       | ✅       | 模拟点击展开下拉框 → 从可用选项中随机选择一个 → 点击选中                      |
| Radio 单选框             | radio      | ✅       | ✅       | 在 `.ant-radio-group` 中找到目标选项 → 点击对应 `input[type=radio]`           |
| Checkbox 多选框          | checkbox   | ✅       | ✅       | 支持单个 Checkbox 和 Checkbox.Group，点击对应 `input[type=checkbox]`          |
| DatePicker 日期选择框    | date       | ✅       | ✅       | 点击打开面板 → 输入日期文本 → 在面板中点击对应日期单元格确认                  |
| DateRangePicker 日期范围 | daterange  | ✅       | ✅       | 识别 `.ant-picker-range`、从 `input.size` 反推 `format` 是否带时分秒          |
| TimePicker 时间选择框    | time       | ✅       | ✅       | 共用 `.ant-picker`，点选时间列 + OK 按钮                                      |
| Cascader 级联选择        | cascader   | ✅       | ✅       | 模拟点击展开级联面板 → 逐级随机选择菜单项 → 自动选到叶子节点完成              |
| TreeSelect 树选择        | treeselect | ✅       | ✅       | 模拟点击展开下拉 → 随机展开折叠节点 → 随机选择一个树节点                      |
| Switch 开关              | switch     | ✅       | ✅       | 检测当前开关状态 → 根据生成值（随机 true/false）决定是否点击切换              |
| Transfer 穿梭框          | transfer   | ✅       | ✅       | 从左侧列表随机勾选 1~3 项 → 点击右移按钮完成穿梭                              |

### 暂不支持（4 类）

| 组件                  | 原因                                                           | 适配难度 | 计划   |
| --------------------- | -------------------------------------------------------------- | -------- | ------ |
| AutoComplete 自动完成 | DOM 结构与 Select 类似但有异步搜索，需要模拟输入触发搜索后选择 | 中       | 待支持 |
| Slider 滑动输入条     | 需要模拟拖拽或点击轨道设置值                                   | 中       | 待评估 |
| Rate 评分             | 需要点击对应星星图标                                           | 低       | 待支持 |
| Mentions 提及         | 类似 Input 但有 @ 触发的弹出面板                               | 中       | 待评估 |

### 不适用（2 类）

| 组件                   | 说明                                         |
| ---------------------- | -------------------------------------------- |
| Upload 上传            | 文件上传需要真实文件，不属于文本数据填充范畴 |
| ColorPicker 颜色选择器 | Ant Design 5 新增组件，antd 4 中不存在       |

### 第三方组件

| 组件               | 扫描识别         | 自动填充 | 说明                                   |
| ------------------ | ---------------- | -------- | -------------------------------------- |
| React Quill 富文本 | ✅ 识别为 custom | ❌       | 富文本编辑器交互复杂，暂不支持自动填充 |

## 反馈问题

遇到「扫不到 / 填不上 / Mock 或 AI 数据过不了校验」的字段，按 [DEVELOPMENT.md 里的失败案例模板](./DEVELOPMENT.md#失败案例汇报模板) 填一份，贴在 Issue / 群里 / 备忘录均可——只要带上对应 `.ant-form-item` 的 **DOM 片段**或**业务代码文件:行号**，就能在 `src/__tests__/failure-cases.test.ts` 里补一条回归用例，防止以后再退化。

> 在 Cursor 里直接说「失败案例」即可触发项目内置 skill（`.cursor/skills/ai-form-failure-case/SKILL.md`），助手会直接贴出同款模板让你填空。

## License

MIT
