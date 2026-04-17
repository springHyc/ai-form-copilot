# AI Form Copilot

智能表单填充浏览器插件 —— 自动识别 Ant Design 表单并生成测试数据，提升后台系统开发和测试效率。

## 功能特性

- **表单自动扫描**：自动识别页面中的 Ant Design 表单字段（Input、Select、Radio、Checkbox、DatePicker、InputNumber 等）
- **AI 智能生成**：根据字段标签语义，通过 AI 大模型（GPT-4o-mini / DeepSeek）生成合理的中文测试数据
- **内置 Mock 规则**：无需 AI API Key 也能使用，基于关键词匹配自动生成测试数据
- **一键填充**：扫描 → 生成 → 填充三步合一，一键完成表单填写
- **React 适配**：绕过 React 受控组件限制，正确触发表单状态更新
- **多模型支持**：支持 OpenAI、DeepSeek 及自定义 API 接口

## 技术栈

- Chrome Extension Manifest V3
- TypeScript + Vite（多配置构建：Popup / Content Script / Background）
- React 19（Popup UI，纯 CSS 无 UI 框架，207KB 轻量包体）
- OpenAI / DeepSeek API（可选，不配置则使用内置 Mock 规则）

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发构建

```bash
npm run build
```

### 加载到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目 `dist` 目录

### 使用方法

1. 打开包含 Ant Design 表单的页面
2. 点击浏览器工具栏中的 AI Form Copilot 图标
3. 点击「一键智能填充」按钮
4. 表单将自动被填充测试数据

### 配置 AI（可选）

切换到「设置」选项卡，配置 AI 服务：

- **OpenAI**：填入 API Key，选择模型（推荐 GPT-4o-mini）
- **DeepSeek**：填入 API Key，API 地址会自动设为 `https://api.deepseek.com`
- **自定义**：可配置任何 OpenAI 兼容的 API 接口

> 不配置 API Key 时，插件会使用内置的 Mock 规则生成数据，对常见字段（姓名、手机号、邮箱、身份证、地址等）有良好支持。

## 项目结构

```
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

## 实现原理

### 整体架构

插件采用 Chrome Extension Manifest V3 架构，由三个独立运行的模块通过消息通信协作完成表单填充：

```
┌────────────┐    chrome.runtime     ┌──────────────────┐    chrome.scripting     ┌──────────────────┐
│  Popup UI  │  ←───────────────→   │  Background SW   │  ←──────────────────→  │  Content Script  │
│ (React)    │    sendMessage        │  (Service Worker)│    executeScript        │  (DOM 操作)      │
│            │                       │                  │    sendMessage          │                  │
│ · 扫描按钮 │  SCAN_FORM ──────→   │ · 消息中转       │  注入扫描代码 ─────→   │ · scanner.ts     │
│ · 生成数据 │  ←────── SCAN_RESULT │ · AI API 调用    │  ←──── 返回字段列表    │ · antd-adapter.ts│
│ · 填充按钮 │  FILL_FORM ──────→   │ · Mock 数据生成  │  FILL_FORM ────────→   │ · 执行 DOM 填充  │
│ · 设置面板 │  ←────── FILL_RESULT │                  │  ←──── 填充完成        │                  │
└────────────┘                       └──────────────────┘                        └──────────────────┘
```

### 核心流程：一键智能填充

```
用户点击「一键智能填充」
        │
        ▼
  ① 扫描表单字段
        │  Popup 发送 SCAN_FORM → Background 通过 chrome.scripting.executeScript
        │  在目标页面注入扫描代码 → 遍历 DOM 中所有顶层 .ant-form-item → 返回字段列表
        ▼
  ② 生成测试数据
        │  有 API Key → Background 调用 AI 大模型 API（OpenAI / DeepSeek）
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
const all = document.querySelectorAll('.ant-form-item');
// 过滤掉嵌套在其他 form-item 内部的子项
const topLevel = all.filter(item => !item.parentElement?.closest('.ant-form-item'));
```

这一步解决了 Pro Components 中 `ProFormDependency` 在 Radio.Group 等容器内动态渲染子表单项的问题——嵌套的子项不会被当成独立字段，避免字段索引错乱。

**2. 按优先级检测字段类型**

对每个 form-item 容器，按优先级从高到低匹配 CSS 选择器：

| 优先级 | 选择器 | 字段类型 | 说明 |
|--------|--------|----------|------|
| 1 | `.ant-cascader` | cascader | 特殊组件优先，避免被 select 误判 |
| 2 | `.ant-tree-select` | treeselect | |
| 3 | `.ant-transfer` | transfer | |
| 4 | `.ant-switch` | switch | |
| 5 | `.ant-select` | select | |
| 6 | `.ant-radio-group` | radio | |
| 7 | `.ant-checkbox-group` | checkbox | |
| 8 | `.ant-picker-range` | daterange | 必须在 .ant-picker 之前 |
| 9 | `.ant-picker` | date | |
| 10 | `.ant-input-number` | number | |
| 11 | `textarea.ant-input` | textarea | 在 input 之前，避免误判 |
| 12 | `input.ant-input` | input | 最通用，优先级最低 |

**3. 提取字段元信息**

- **标签**：从 `.ant-form-item-label label` 提取，去除必填星号和冒号
- **选项**：Radio / Checkbox 取 wrapper 直属 span 文本（避免拾取 ProFormDependency 嵌套内容），Select 取已选项文本
- **约束**：提取 `maxLength`、`min`、`max` 属性
- **必填**：检查 `.ant-form-item-required` 类名或 `aria-required` 属性

### 模块二：数据生成（mock-rules.ts + ai-service.ts）

**Mock 规则引擎**（无需 AI，开箱即用）：

```
字段 label → 正则匹配 → 对应生成函数
  "姓名"      → /姓名|联系人/   → randomChineseName()    → "赵雪萍"
  "手机号"    → /手机|电话/     → randomPhone()          → "13847529163"
  "邮箱"      → /邮箱|email/    → randomEmail()          → "user38271_k9f2@qq.com"
  "计划时间"  → type=daterange  → randomDateRange()      → "2026-04-20,2026-06-15"
  未匹配      → 按 type 兜底   → randomText/randInt 等
```

- 所有随机数使用 `crypto.getRandomValues()` 生成，避免 Math.random 的伪随机重复问题
- 编码类字段掺入 `Date.now().toString(36)` 时间戳确保每次唯一

**AI 模式**（配置 API Key 后启用）：

AI 只参与「生成测试数据」这一个环节，扫描和填充都是纯 DOM 操作，与 AI 无关。流程如下：

1. 将扫描到的字段信息（标签、类型、选项、约束等）打包成结构化 Prompt
2. 调用 OpenAI 兼容 API（支持 DeepSeek、GPT-4o-mini 等），启用 JSON Mode 确保返回格式正确
3. 解析 AI 返回的 JSON，每个字段 ID 对应一个生成值

配 AI 与不配 AI 的区别：

| | 不配 AI（Mock 规则） | 配了 AI（如 DeepSeek） |
|---|---|---|
| 生成速度 | 瞬间（本地计算） | 1~3 秒（网络请求） |
| 常见字段（姓名/手机/邮箱） | 好，有专门规则 | 好 |
| 业务专属字段（计划名称/隔离设置等） | 差，只能生成随机文本 | 好，能理解语义生成合理数据 |
| 字段间关联性 | 无，各字段独立生成 | 有，AI 理解字段之间的业务关系 |
| 是否需要联网 | 不需要 | 需要（调用 API） |
| 费用 | 免费 | DeepSeek V3 约 ¥1/百万 token，极低 |

示例对比——假设扫描到字段 `计划名称`、`执行设定`、`隔离设置`：

```
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
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
// 2. 通过原生 setter 设值（绕过 React 劫持的 setter）
setter.call(inputElement, '张三');
// 3. 手动派发事件，触发 React 的事件系统
inputElement.dispatchEvent(new Event('input', { bubbles: true }));
inputElement.dispatchEvent(new Event('change', { bubbles: true }));
```

**交互式组件（Select / DatePicker / Cascader 等）的填充原理：**

模拟完整的用户交互流程，而非直接操作值：

```
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

| 消息类型 | 方向 | 载荷 |
|----------|------|------|
| SCAN_FORM | Popup → Background | 无 |
| SCAN_RESULT | Background → Popup | `{ fields: FormFieldInfo[] }` |
| GENERATE_DATA | Popup → Background | `{ fields, aiConfig }` |
| GENERATE_RESULT | Background → Popup | `{ data: FillData }` |
| FILL_FORM | Popup → Background → Content | `{ data: FillData }` |
| FILL_RESULT | Content → Background → Popup | `{ filledCount: number }` |

**可靠性保障**：
- 扫描阶段使用 `chrome.scripting.executeScript` 直接注入执行，不依赖 Content Script 预加载
- 填充阶段使用 fallback 机制：若 `chrome.tabs.sendMessage` 失败（Content Script 未加载），先注入 `content.js` 再重试

### Pro Components 兼容原理

`@ant-design/pro-components` 底层完全基于 antd 组件渲染，DOM 结构保持一致（`.ant-form-item`、`.ant-picker`、`.ant-select` 等 class 不变）。兼容的关键在于：

1. **嵌套过滤**：ProFormDependency 会在容器内部条件性渲染子 form-item，通过 `parentElement.closest('.ant-form-item')` 过滤嵌套项
2. **选项文本纯净提取**：Radio/Checkbox wrapper 只取直属 span 文本，不拾取嵌套的 ProFormDigit 等内容
3. **精确选择器**：使用 `.ant-form-item` 而非 `[class*="ant-form-item"]`，避免匹配到 `.ant-form-item-control` 等内部元素

## Ant Design 4 表单组件支持情况

基于 [Ant Design 组件总览](https://ant.design/components/overview-cn) 中「数据录入」分类，逐一整理支持状态。

### 已支持（14 个）

同时兼容 antd 原生组件和 `@ant-design/pro-components`（ProFormText、ProFormSelect、ProFormDateRangePicker 等）。

| 组件 | 类型 | 扫描识别 | 自动填充 | 填充策略 |
|------|------|---------|---------|---------|
| Input 输入框 | input | ✅ | ✅ | 通过原生 `valueSetter` 设值 + 派发 `input`/`change` 事件，绕过 React 受控组件 |
| Input.TextArea 文本域 | textarea | ✅ | ✅ | 同 Input |
| Input.Password 密码框 | input | ✅ | ✅ | 通过 `.ant-input-affix-wrapper` 识别，填充策略同 Input |
| InputNumber 数字输入框 | number | ✅ | ✅ | 操作 `.ant-input-number-input` 内部 input |
| Select 选择器 | select | ✅ | ✅ | 模拟点击展开下拉框 → 从可用选项中随机选择一个 → 点击选中 |
| Radio 单选框 | radio | ✅ | ✅ | 在 `.ant-radio-group` 中找到目标选项 → 点击对应 `input[type=radio]` |
| Checkbox 多选框 | checkbox | ✅ | ✅ | 支持单个 Checkbox 和 Checkbox.Group，点击对应 `input[type=checkbox]` |
| DatePicker 日期选择框 | date | ✅ | ✅ | 点击打开面板 → 输入日期文本 → 在面板中点击对应日期单元格确认 |
| DateRangePicker 日期范围 | daterange | ✅ | ✅ | 识别 `.ant-picker-range` → 自动生成开始/结束两个日期 → 依次填充两个输入框 |
| TimePicker 时间选择框 | date | ✅ | ✅ | 与 DatePicker 共用 `.ant-picker`，填充策略相同 |
| Cascader 级联选择 | cascader | ✅ | ✅ | 模拟点击展开级联面板 → 逐级随机选择菜单项 → 自动选到叶子节点完成 |
| TreeSelect 树选择 | treeselect | ✅ | ✅ | 模拟点击展开下拉 → 随机展开折叠节点 → 随机选择一个树节点 |
| Switch 开关 | switch | ✅ | ✅ | 检测当前开关状态 → 根据生成值（随机 true/false）决定是否点击切换 |
| Transfer 穿梭框 | transfer | ✅ | ✅ | 从左侧列表随机勾选 1~3 项 → 点击右移按钮完成穿梭 |

### 未支持（4 个）

| 组件 | 原因 | 适配难度 | 计划 |
|------|------|---------|------|
| AutoComplete 自动完成 | DOM 结构与 Select 类似但有异步搜索，需要模拟输入触发搜索后选择 | 中 | 待支持 |
| Slider 滑动输入条 | 需要模拟拖拽或点击轨道设置值 | 中 | 待评估 |
| Rate 评分 | 需要点击对应星星图标 | 低 | 待支持 |
| Mentions 提及 | 类似 Input 但有 @ 触发的弹出面板 | 中 | 待评估 |

### 不适用（2 个）

| 组件 | 说明 |
|------|------|
| Upload 上传 | 文件上传需要真实文件，不属于文本数据填充范畴 |
| ColorPicker 颜色选择器 | Ant Design 5 新增组件，antd 4 中不存在 |

### 第三方组件

| 组件 | 扫描识别 | 自动填充 | 说明 |
|------|---------|---------|------|
| React Quill 富文本 | ✅ 识别为 custom | ❌ | 富文本编辑器交互复杂，暂不支持自动填充 |

## License

MIT
