# AI Form Copilot — 开发者文档

面向贡献者 / 维护者 / 二次开发者。终端用户使用说明见 [README.md](./README.md)。

## 技术栈

- Chrome Extension Manifest V3
- TypeScript + Vite（多配置构建：Popup / Content Script / Background）
- React 19（Popup UI，纯 CSS 无 UI 框架，约 207KB 包体）
- OpenAI 兼容 API（可选：OpenAI / DeepSeek / Kimi 及智谱、百炼、MiniMax、火山方舟、硅基流动、百川等内置预设 + 自定义；不配置则使用内置 Mock 规则）
- Vitest + jsdom（失败案例回归测试）

## 从源码构建

```bash
npm install

# 一次性构建（Popup + Content + Background），产物在 dist/
npm run build

# 仅 Popup 开发：启动 Vite dev server（Content / Background 仍需先 build 一次）
npm run dev

# 回归测试
npm run test         # 单次跑
npm run test:watch   # 监听模式
```

构建完成后进入 `chrome://extensions/` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选 `dist/` 目录即可。

单独构建某一块：

```bash
npm run build:popup        # 只构建 Popup UI
npm run build:content      # 只构建 Content Script
npm run build:background   # 只构建 Background Service Worker
```

## 项目结构

```text
src/
├── popup/              # Popup 弹窗 UI（React + 纯 CSS）
│   ├── App.tsx         # 主界面：填充面板 + 设置面板 + Toast 消息系统
│   ├── main.tsx        # 入口
│   └── style.css       # 完整样式（按钮/标签/表单/卡片/开关/动画）
├── background/         # Background Service Worker
│   └── index.ts        # 消息路由 + chrome.scripting 扫描注入 + AI 调用中转
├── content/            # Content Script（注入目标页面执行 DOM 操作）
│   ├── index.ts        # 消息监听入口（防重复注入守卫）
│   ├── scanner.ts      # 表单字段扫描器（嵌套过滤 + 类型检测 + 元信息提取）
│   └── antd-adapter.ts # Ant Design 表单填充适配器（14 种组件的交互模拟）
├── shared/             # Popup / Background / Content 共享模块
│   ├── types.ts        # FieldType / FormFieldInfo / FillData / Settings 类型定义
│   ├── messages.ts     # 消息类型枚举 + 消息接口（TypeScript 联合类型）
│   └── ai-service.ts   # OpenAI 兼容 API 调用（Prompt 构建 + JSON Mode 解析）
└── utils/
    └── mock-rules.ts   # 内置 Mock 规则引擎（关键词匹配 + crypto 随机 + 时间戳唯一性）
```

## AI 服务商与实现

### 类型与存储

- `src/shared/types.ts`：`AiProvider` 联合类型（`openai` | `deepseek` | `kimi` | `zhipu` | `bailian` | `minimax` | `volcengine` | `siliconflow` | `baichuan` | `custom`），`AIConfig.provider` 使用该类型；`Settings.aiConfig` 经 `chrome.storage.local` 持久化。

### Popup 预设（与代码一致）

`src/popup/App.tsx` 内 **`MODEL_PRESETS`**（按服务商分组的模型下拉）与 **`PROVIDER_URLS`**（切换服务商时写入的默认 `baseUrl`）与下表一致；用户仍可手动改「API 地址」输入框（例如换地域、火山 `ep-xxxx` 等）。

| `provider`    | 展示名（约）     | 默认 `baseUrl`（去尾 `/` 后由 `ai-service` 拼 `/chat/completions`）      |
| ------------- | ---------------- | ------------------------------------------------------------------------ |
| `openai`      | OpenAI           | `https://api.openai.com/v1`                                              |
| `deepseek`    | DeepSeek         | `https://api.deepseek.com`                                               |
| `kimi`        | Kimi（月之暗面） | 见 `moonshot-kimi.ts`：`kimi-k2.6` / `kimi-k2.5` 走 Anthropic 兼容 `/anthropic`，其余走国内 OpenAI 兼容 `/v1` |
| `zhipu`       | 智谱 GLM         | `https://open.bigmodel.cn/api/paas/v4`                                   |
| `bailian`     | 阿里百炼         | `https://dashscope.aliyuncs.com/compatible-mode/v1`                      |
| `minimax`     | MiniMax          | `https://api.minimaxi.com/v1`                                            |
| `volcengine`  | 火山方舟         | `https://ark.cn-beijing.volces.com/api/v3`                               |
| `siliconflow` | 硅基流动         | `https://api.siliconflow.cn/v1`                                          |
| `baichuan`    | 百川智能         | `https://api.baichuan-ai.com/v1`                                         |
| `custom`      | 自定义           | 空字符串，由用户填写                                                     |

套餐 / 模型命名对照可参考 [AI Coding Plan 对比](https://z4crk6mg95.coze.site/) 等第三方汇总页；**以各云控制台为准**。

### 调用链与协议

- `Popup` 发 `GENERATE_DATA` → `background/index.ts` 调 `generateWithAI(fields, aiConfig)`（`src/shared/ai-service.ts`）。
- **Kimi**：若 `baseUrl` 判定为 Moonshot Anthropic 风格（见 `isMoonshotAnthropicStyleBase`），走 **`POST {base}/v1/messages`**，请求体为 Anthropic 格式；否则走 OpenAI **`POST {base}/chat/completions`**。
- **其余内置预设 + `custom`**：统一走 **`POST {baseUrl}/chat/completions`**，`Authorization: Bearer <apiKey>`，与 OpenAI SDK 兼容。
- **`response_format: { type: 'json_object' }`**：除 **`minimax`** 外均附带（MiniMax 部分兼容层不接受该字段会 400）；MiniMax 仅依赖 system prompt 约束返回 JSON，解析逻辑与其它分支相同。

## 实现原理

### 整体架构

插件采用 Chrome Extension Manifest V3 架构，由三个独立运行的模块通过消息通信协作完成表单填充：

```text
┌────────────┐    chrome.runtime     ┌──────────────────┐    chrome.scripting     ┌──────────────────┐
│  Popup UI  │  ←───────────────→    │  Background SW   │  ←──────────────────→   │  Content Script  │
│ (React)    │    sendMessage        │  (Service Worker)│    executeScript        │  (DOM 操作)      │
│            │                       │                  │    sendMessage          │                  │
│ · 扫描按钮  │  SCAN_FORM ──────→    │ · 消息中转         │  注入扫描代码 ─────→     │ · scanner.ts     │
│ · 生成数据  │  ←────── SCAN_RESULT  │ · AI API 调用     │  ←──── 返回字段列表       │ · antd-adapter.ts│
│ · 填充按钮  │  FILL_FORM ──────→    │ · Mock 数据生成   │  FILL_FORM ────────→     │ · 执行 DOM 填充  │
│ · 设置面板  │  ←────── FILL_RESULT  │                  │  ←──── 填充完成           │                  │
└────────────┘                       └──────────────────┘                          └──────────────────┘
```

### 核心流程：一键智能填充

```text
用户点击「一键智能填充」
        │
        ▼
  ① 扫描表单字段
        │  Popup 发送 SCAN_FORM → Background 通过 chrome.scripting.executeScript
        │  在目标页面注入扫描代码 → 遍历 DOM 中所有顶层 .ant-form-item → 返回字段列表
        ▼
  ② 生成测试数据
        │  有 API Key → Background 调用 AI 大模型 API（OpenAI 兼容：含内置国内预设等，见上文「AI 服务商与实现」）
        │  无 API Key → Popup 本地调用 mock-rules 基于关键词规则生成
        ▼
  ③ 填充表单
        │  Popup 发送 FILL_FORM → Background 转发给 Content Script
        │  → antd-adapter 按字段类型逐个模拟用户交互填入数据
        ▼
  填充完成，返回成功数量
```

### 模块一：表单扫描器（scanner.ts）

扫描器负责识别页面中所有 Ant Design 表单字段，输出结构化的字段信息列表。

**1. 收集顶层 form-item，过滤嵌套项**

```javascript
// 只用精确的 .ant-form-item 类名选择器
const all = document.querySelectorAll(".ant-form-item");
// 过滤掉嵌套在其他 form-item 内部的子项
const topLevel = all.filter(
  (item) => !item.parentElement?.closest(".ant-form-item"),
);
```

这一步解决了 Pro Components 中 `ProFormDependency` 在 Radio.Group 等容器内动态渲染子表单项的问题——嵌套的子项不会被当成独立字段，避免字段索引错乱。

**2. 按优先级检测字段类型**

对每个 form-item 容器，按优先级从高到低匹配 CSS 选择器：

| 优先级 | 选择器                | 字段类型   | 说明                             |
| ------ | --------------------- | ---------- | -------------------------------- |
| 1      | `.ant-cascader`       | cascader   | 特殊组件优先，避免被 select 误判 |
| 2      | `.ant-tree-select`    | treeselect |                                  |
| 3      | `.ant-transfer`       | transfer   |                                  |
| 4      | `.ant-switch`         | switch     |                                  |
| 5      | `.ant-select`         | select     |                                  |
| 6      | `.ant-radio-group`    | radio      |                                  |
| 7      | `.ant-checkbox-group` | checkbox   |                                  |
| 8      | `.ant-picker-range`   | daterange  | 必须在 .ant-picker 之前          |
| 9      | `.ant-picker`         | date       |                                  |
| 10     | `.ant-input-number`   | number     |                                  |
| 11     | `textarea.ant-input`  | textarea   | 在 input 之前，避免误判          |
| 12     | `input.ant-input`     | input      | 最通用，优先级最低               |

**3. 提取字段元信息**

- **标签**：从 `.ant-form-item-label label` 提取，去除必填星号和冒号
- **选项**：Radio / Checkbox 取 wrapper 直属 span 文本（避免拾取 ProFormDependency 嵌套内容），Select 取已选项文本
- **约束**：提取 `maxLength`、`min`、`max` 属性
- **必填**：检查 `.ant-form-item-required` 类名或 `aria-required` 属性

### 模块二：数据生成（mock-rules.ts + ai-service.ts）

**Mock 规则引擎**（无需 AI，开箱即用）：

```text
字段 label → 正则匹配 → 对应生成函数
  "姓名"      → /姓名|联系人/   → randomChineseName()    → "赵雪萍"
  "手机号"    → /手机|电话/     → randomPhone()          → "13847529163"
  "邮箱"      → /邮箱|email/    → randomEmail()          → "user38271_k9f2@qq.com"
  "计划时间"  → type=daterange  → randomDateRange()      → "2026-04-20,2026-06-15"
  未匹配      → 按 type 兜底   → randomText/randInt 等
```

- 所有随机数使用 `crypto.getRandomValues()` 生成，避免 Math.random 的伪随机重复问题
- 编码类字段掺入 `Date.now().toString(36)` 时间戳确保每次唯一
- Select 家族（select / cascader / treeselect / transfer）统一在 `LABEL_RULES` 之前短路：有 options 就 `pickOne`、无 options 就 `"random"`，避免 label 含 `id / 编号 / 公司 …` 的异步下拉被文本规则命中得到无法匹配的字符串

**AI 模式**（配置 API Key 后启用）：

AI 只参与「生成测试数据」这一个环节，扫描和填充都是纯 DOM 操作，与 AI 无关。流程如下：

1. 将扫描到的字段信息（标签、类型、选项、约束等）打包成结构化 Prompt
2. 调用 OpenAI 兼容 API（或 Kimi 的 Anthropic 兼容分支），默认启用 **`response_format: json_object`**（`minimax` 除外，见「AI 服务商与实现」）以约束返回 JSON
3. 解析 AI 返回的 JSON，每个字段 ID 对应一个生成值

配 AI 与不配 AI 的区别：

|                                     | 不配 AI（Mock 规则） | 配了 AI（如 DeepSeek）             |
| ----------------------------------- | -------------------- | ---------------------------------- |
| 生成速度                            | 瞬间（本地计算）     | 1~3 秒（网络请求）                 |
| 常见字段（姓名/手机/邮箱）          | 好，有专门规则       | 好                                 |
| 业务专属字段（计划名称/隔离设置等） | 差，只能生成随机文本 | 好，能理解语义生成合理数据         |
| 字段间关联性                        | 无，各字段独立生成   | 有，AI 理解字段之间的业务关系      |
| 是否需要联网                        | 不需要               | 需要（调用 API）                   |
| 费用                                | 免费                 | DeepSeek V3 约 ¥1/百万 token，极低 |

示例对比——假设扫描到字段 `计划名称`、`执行设定`、`隔离设置`：

```text
Mock 规则生成：
  计划名称 → 匹配 /名称/ → "鼎信科技有限公司"   ← 不知道该填公司还是计划
  执行设定 → 无匹配规则  → "测试_k9f2_847"      ← 无意义
  隔离设置 → 无匹配规则  → 无数据               ← 跳过

DeepSeek 生成：
  计划名称 → "Q2用户触达提频计划"                ← 理解是"计划"的名称
  执行设定 → "每周执行"                          ← 理解业务含义
  隔离设置 → "严格隔离"                          ← 理解上下文语义
```

AI 的核心价值：当表单包含业务专属字段时，AI 能理解字段的业务语义，生成有意义的测试数据，而不是随机字符串。对于后台系统中的专业业务表单（营销计划、风控规则、审批流程等），配上 AI 会显著提升数据质量。

### 模块三：表单填充适配器（antd-adapter.ts）

填充的核心难点是 **React 受控组件**——直接设置 `input.value` 不会触发 React 的 `onChange`，表单状态不会更新。

**Input / Textarea / Number 的填充原理：**

```javascript
// 1. 获取 HTMLInputElement 原型上的原生 value setter
const setter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
).set;
// 2. 通过原生 setter 设值（绕过 React 劫持的 setter）
setter.call(inputElement, "张三");
// 3. 手动派发事件，触发 React 的事件系统
inputElement.dispatchEvent(new Event("input", { bubbles: true }));
inputElement.dispatchEvent(new Event("change", { bubbles: true }));
```

**交互式组件（Select / DatePicker / Cascader 等）的填充原理：**

模拟完整的用户交互流程，而非直接操作值：

```text
Select:     模拟点击 selector → 等待 dropdown 出现 → 从选项中随机选一个 → 点击选中
DatePicker: 模拟点击 input → 等待 panel 出现 → 输入日期文本 → 点击面板中对应的日期单元格
RangePicker:同上，但依次处理两个 input（开始日期 + 结束日期）
Cascader:   模拟点击 → 逐级展开菜单列 → 每级随机选一项 → 直到叶子节点
Radio:      在 radio-group 中找到匹配选项 → 点击对应 input[type=radio]
Switch:     检测当前状态 → 状态不符时模拟点击切换
Transfer:   左侧列表随机勾选 1~3 项 → 点击右移按钮
```

每步之间通过 `await sleep(ms)` 等待 UI 渲染完成，确保异步 DOM 更新（如 Ant Design 的动画和 Portal 弹层）就绪后再执行下一步。

### 模块四：消息通信协议

三个模块之间通过 `chrome.runtime.sendMessage` 和 `chrome.tabs.sendMessage` 通信，所有消息使用 TypeScript 联合类型严格约束：

| 消息类型        | 方向                         | 载荷                          |
| --------------- | ---------------------------- | ----------------------------- |
| SCAN_FORM       | Popup → Background           | 无                            |
| SCAN_RESULT     | Background → Popup           | `{ fields: FormFieldInfo[] }` |
| GENERATE_DATA   | Popup → Background           | `{ fields, aiConfig }`        |
| GENERATE_RESULT | Background → Popup           | `{ data: FillData }`          |
| FILL_FORM       | Popup → Background → Content | `{ data: FillData }`          |
| FILL_RESULT     | Content → Background → Popup | `{ filledCount: number }`     |

**可靠性保障**：

- 扫描阶段使用 `chrome.scripting.executeScript` 直接注入执行，不依赖 Content Script 预加载
- 填充阶段使用 fallback 机制：若 `chrome.tabs.sendMessage` 失败（Content Script 未加载），先注入 `content.js` 再重试

### Pro Components 兼容原理

`@ant-design/pro-components` 底层完全基于 antd 组件渲染，DOM 结构保持一致（`.ant-form-item`、`.ant-picker`、`.ant-select` 等 class 不变）。兼容的关键在于：

1. **嵌套过滤**：ProFormDependency 会在容器内部条件性渲染子 form-item，通过 `parentElement.closest('.ant-form-item')` 过滤嵌套项
2. **选项文本纯净提取**：Radio/Checkbox wrapper 只取直属 span 文本，不拾取嵌套的 ProFormDigit 等内容
3. **精确选择器**：使用 `.ant-form-item` 而非 `[class*="ant-form-item"]`，避免匹配到 `.ant-form-item-control` 等内部元素

## 测试

所有回归用例集中在 `src/__tests__/failure-cases.test.ts`（Vitest + jsdom），按「失败案例 N」顺序追加，覆盖 scan / mock / fill / popup 四侧曾经漏过的场景。开发新增 / 修改前后建议都跑一次：

```bash
npm run test
```

每次发版（`npm run build:prod*`）前**强烈建议**先跑一遍完整测试确认没退化。

## 发布流程（打包 zip + 推送 tag）

日常开发只需 `npm run build`，**正式发一个版本**用下面三条一步到位的命令（按语义化版本选一条）：

| 命令                       | 版本变化（以 `1.0.0` 为例） | 典型场景                  |
| -------------------------- | --------------------------- | ------------------------- |
| `npm run build:prod`       | `1.0.0 → 1.0.1` (patch)     | Bug 修复、兼容性补丁      |
| `npm run build:prod:minor` | `1.0.0 → 1.1.0` (minor)     | 新增失败案例覆盖 / 新组件 |
| `npm run build:prod:major` | `1.0.0 → 2.0.0` (major)     | 不兼容改动、协议变更      |

每条命令依次做四件事：

1. `npm version <level> --no-git-tag-version` —— 只改 `package.json` / `package-lock.json`，**不自动 commit / tag**（留给最后一步统一处理）。
2. `npm run build` —— 依次跑三份 Vite 配置（Popup / Content / Background），产物输出到 `dist/`。
3. `npm run pack:dist` —— 执行 `scripts/pack-dist.mjs`，把 `dist/` 打成 `releases/ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip`（本地时间戳，同版本多次打包按时间累积；`releases/` 已在 `.gitignore` 中）。
4. `npm run publish:tag` —— 执行 `scripts/publish-tag.mjs`，把版本 bump 提交为 `chore: release v<version>`、打 `v<version>` tag，然后 `git push` + `git push origin v<version>`。同名 tag 已存在会直接终止，避免覆盖历史。

### 单独使用

- `npm run pack:dist` —— 不升版本、不 commit / tag，仅把当前 `dist/` 用 `package.json` 里现有的版本号重打一个带时间戳的 zip（适合打包没动但想补发压缩包）。
- `npm run publish:tag` —— 仅提交版本变更 + 打 tag + 推远端（适合之前 build + pack 成功但 push 阶段失败，补跑最后一步）。

### 常见问题

- **Build 失败怎么恢复？** `--no-git-tag-version` 保证 `package.json` 的版本号改动只在工作区，还没进 git；失败后跑 `git checkout package.json package-lock.json` 即可。
- **第一次 push 需要 upstream**：如果当前分支没有跟踪远端分支，`git push` 会报 `no upstream branch`，先 `git push -u origin <branch>` 一次，之后都能直接 push。
- **撤销一次发布**：`git tag -d v<version> && git reset --hard HEAD~1 && git push origin :refs/tags/v<version>`（最后一条仅当 tag 已推到远端时需要）。
- **历史 zip 归档**：`releases/` 目录不会被 `npm run build` 清理，本地保留即可；远端分发建议把 zip 挂到对应 tag 的 GitHub Release 附件上。

## 失败案例汇报模板

发现「扫不到 / 填不上 / Mock 或 AI 数据过不了校验」时，按下面模板新开一条（可贴在 Issue、备忘录或 `CHANGELOG` 草稿里），并尽量附上 **对应 `.ant-form-item` 的 DOM** 或 **业务代码路径（文件:行号）**，便于在 `src/__tests__/failure-cases.test.ts` 里加回归用例。

**Cursor**：在聊天里说 **「失败案例」** 或 **「失败案例模板」** 等，可触发项目技能 **`ai-form-failure-case`**（`.cursor/skills/ai-form-failure-case/SKILL.md`），由助手直接贴出同款模板供你填空。

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
