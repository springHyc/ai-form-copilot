# AI Form Copilot

智能表单填充浏览器插件 —— 自动识别 Ant Design 表单并生成合规测试数据，面向后台系统的开发、测试、产品同学，一键把一整页表单填上。

> 想看实现原理 / 从源码构建 / 发版流程？请跳转 [DEVELOPMENT.md](./DEVELOPMENT.md)。

## 安装

### 方式 1：下载已构建的 zip（推荐）

1. 到仓库 [releases/ 目录](https://gitlab-hlw.shuqudata.com/bairong/ai-form-copilot/-/tree/main/releases) 下载最新的 `ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip`。
2. 解压到任意本地目录（确认目录里有 `manifest.json`）。
3. 打开 Chrome，访问 `chrome://extensions/`，开启右上角「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择第 2 步解压出来的整个文件夹。

### 方式 2：从源码构建

本地跑 `npm install && npm run build`，然后加载 `dist/` 目录。详细步骤见 [DEVELOPMENT.md](./DEVELOPMENT.md#从源码构建)。

## 功能特性

| 功能                 | 说明                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **表单自动扫描**     | 识别 Ant Design 常见控件 **14 类**：Input、Textarea、Select、Radio、Checkbox、DatePicker、RangePicker、TimePicker、InputNumber、Cascader、TreeSelect、Switch、Transfer 等  |
| **AI 智能生成**      | 内置 OpenAI / DeepSeek / Kimi 及智谱、百炼、MiniMax、火山方舟、硅基、百川等预设（需自备 API Key），支持 **自定义** Base URL；按标签、placeholder、校验规则生成中文测试数据 |
| **内置 Mock 规则**   | 不配 AI 也可用；关键词覆盖姓名、手机、邮箱、身份证、地址、公司、日期、时间、金额、编号等；支持从 HTML `pattern` 与「只能包含…」类提示反解字符集                            |
| **一键填充**         | 「扫描 → 生成 → 填充」可一步完成，也可分步执行                                                                                                                             |
| **多轮纠偏**         | 读取红字校验（如 `.ant-form-item-explain-error`、`role="alert"`）回灌下一轮，直至通过                                                                                      |
| **Pro / React 适配** | 兼容 `@ant-design/pro-components`；绕过受控组件对 `input.value` 的劫持，正确触发 `onChange`                                                                                |
| **antd 4 / 5+ / 6+** | 覆盖多版本 DOM 差异（如 `.ant-select-selection` / `.ant-select-selector`、下拉项 class 等）                                                                                |

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

| 服务商                    | 说明                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**                | 填 API Key；默认 `https://api.openai.com/v1`；模型下拉含 `gpt-4o-mini` 等。                                                                                                                                    |
| **DeepSeek**              | 填 API Key；默认 `https://api.deepseek.com`；模型 `deepseek-chat`（V3.2 非思考）/ `deepseek-reasoner`（V3.2 思考），与 [官方文档](https://api-docs.deepseek.com/) 一致。                                       |
| **Kimi（月之暗面）**      | 填 API Key；`kimi-k2.6` / `kimi-k2.5` 走 **Anthropic 兼容 `/anthropic`**，其余走 **OpenAI 兼容 `/v1`**（见 `src/shared/moonshot-kimi.ts`）；模型列表见 [Kimi 模型列表](https://platform.kimi.ai/docs/models)。 |
| **智谱 GLM**              | 填 API Key；默认 `https://open.bigmodel.cn/api/paas/v4`；模型如 `glm-4-flash` / `glm-4-plus` 等。                                                                                                              |
| **阿里百炼（DashScope）** | 填 API Key；默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`；模型如 `qwen-plus` / `qwen-turbo` / `qwen-max`。                                                                                         |
| **MiniMax**               | 填 API Key；默认 `https://api.minimaxi.com/v1`；模型如 `MiniMax-M2` / `abab6.5s-chat`。                                                                                                                        |
| **火山方舟（豆包等）**    | 填 API Key；默认 `https://ark.cn-beijing.volces.com/api/v3`；模型下拉为常见豆包示例名，**以控制台实际推理接入点 / 模型名为准**。                                                                               |
| **硅基流动**              | 填 API Key；默认 `https://api.siliconflow.cn/v1`；模型为 `deepseek-ai/DeepSeek-V3`、`Qwen/...` 等路由名。                                                                                                      |
| **百川智能**              | 填 API Key；默认 `https://api.baichuan-ai.com/v1`；模型如 `Baichuan4-Turbo` 等。                                                                                                                               |
| **自定义**                | 任意 OpenAI 兼容 Base URL + 模型名（公司内网网关、火山 `ep-xxxx` 接入点等）。                                                                                                                                  |

- 各平台 **套餐与模型命名** 会随官方调整，下拉仅为常用默认；更全对比可参考 [AI Coding Plan 对比（国内主流 AI 平台）](https://z4crk6mg95.coze.site/)。
- **火山方舟**若使用控制台给出的 **接入点 ID**（`ep-xxxx`）作为模型名，或 Base 与默认北京区不一致，请用 **自定义** 填写完整 **API 地址** 与 **模型**。

> 不配 API Key 时，插件会使用内置的 Mock 规则生成数据，对常见字段（姓名、手机、邮箱、身份证、地址、日期、金额、编号等）已有良好支持。AI 主要在「业务专属字段」（如「营销计划名称」「隔离设置」「渠道代码」等需要理解语义才能填对的字段）上显著提升数据质量。

实现细节（`AiProvider`、`response_format` 对 MiniMax 的特例等）见 [DEVELOPMENT.md — AI 服务商与实现](./DEVELOPMENT.md#ai-服务商与实现)。

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

遇到「扫不到 / 填不上 / Mock 或 AI 数据过不了校验」的字段，可以按一下模板直接反馈给我。

```markdown
失败案例 N

1. 页面：<系统/菜单路径，如 营销中台-短链管理-新增>
2. 失败字段（label）：<表单项标签文案>
3. 字段类型（你看到的）：<scanner 识别的类型：input / textarea / select / radio / date / number …>
4. 期望结果：<应如何填或应满足什么规则>
5. 实际结果：<当前插件行为>
6. 关键 DOM：贴出问题字段所在整段 `.ant-form-item` HTML；若有红字，一并贴 `.ant-form-item-explain` / `#xxx_help` / `role="alert"` 结构
7. 业务代码（可选）：`<仓库>/path/to/File.tsx:起始行-结束行`（含 ProForm 字段名、rules、fieldProps）
8. 环境（可选）：antd 主版本（4/5）、Chrome 版本、是否一键填充 / 仅填充
```
