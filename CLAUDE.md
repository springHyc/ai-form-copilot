# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI Form Copilot 是一个 Chrome Extension MV3 插件，用于自动识别并智能填充 Ant Design 表单字段，支持 AI 生成测试数据和内置 Mock 规则两种模式。

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（Vite 热重载）
npm run build        # 完整构建（生成 dist/ 目录）
npm run build:popup      # 仅构建 Popup UI
npm run build:content    # 仅构建 Content Script
npm run build:background # 仅构建 Background Service Worker
```

构建产物输出到 `dist/` 目录，加载到 Chrome：chrome://extensions/ → 开发者模式 → 加载已解压的扩展程序 → 选择 `dist`。

## 架构概览

Chrome Extension MV3 三模块架构，通过 `chrome.runtime.sendMessage` 消息通信：

```
Popup (React) ←──sendMessage──→ Background (Service Worker) ←──executeScript──→ Content Script (DOM)
     │                                    │                                    │
     │  SCAN_FORM ──────────────→         │                                    │
     │  ←─────────────── SCAN_RESULT      │                                    │
     │  GENERATE_DATA ─────────→          │                                    │
     │  ←─────────────── GENERATE_RESULT  │                                    │
     │  FILL_FORM ────────────────────────────────→                           │
     │  ←──────────────────────────────────────────── FILL_RESULT             │
```

### 模块职责

- **Popup (src/popup/)**：React 19 UI，主界面包含扫描按钮、填充按钮、设置面板
- **Background (src/background/)**：Service Worker，消息路由、AI API 调用中转、扫描代码注入
- **Content Script (src/content/)**：DOM 操作，表单扫描和填充（scanner.ts + antd-adapter.ts）
- **Shared (src/shared/)**：共享类型 (types.ts)、消息协议 (messages.ts)、AI 服务 (ai-service.ts)
- **Utils (src/utils/)**：mock-rules.ts 内置 Mock 规则引擎（关键词匹配生成测试数据）

### 消息协议 (src/shared/messages.ts)

| 消息类型 | 方向 | 载荷 |
|---------|------|------|
| SCAN_FORM | Popup → Background | 无 |
| SCAN_RESULT | Background → Popup | `{ fields: FormFieldInfo[] }` |
| GENERATE_DATA | Popup → Background | `{ fields, aiConfig }` |
| GENERATE_RESULT | Background → Popup | `{ data: FillData }` |
| FILL_FORM | Popup → Background → Content | `{ data: FillData }` |
| FILL_RESULT | Content → Background → Popup | `{ filledCount: number }` |

### 表单填充核心逻辑 (src/content/antd-adapter.ts)

绕过 React 受控组件的关键技术：
```typescript
// 通过原生 value setter 设值（绕过 React 劫持）
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
setter.call(inputElement, "value");
// 手动派发事件触发 React 事件系统
inputElement.dispatchEvent(new Event("input", { bubbles: true }));
inputElement.dispatchEvent(new Event("change", { bubbles: true }));
```

交互式组件（Select/DatePicker/Cascader 等）通过模拟完整用户交互流程填充，而非直接操作值。

## 类型定义 (src/shared/types.ts)

核心类型：
- `FieldType`: 字段类型枚举（input/select/radio/checkbox/date/cascader/treeselect/switch/transfer/textarea/number/daterange）
- `FormFieldInfo`: 扫描出的字段信息（id/label/type/options/required）
- `FillData`: 填充数据映射 `{ [fieldId: string]: string }`
- `Settings`: 用户设置（aiModel/apiKey/apiUrl 等）

## Mock vs AI 模式

- **Mock 模式**（无 API Key）：使用 `src/utils/mock-rules.ts` 关键词匹配生成
- **AI 模式**（有 API Key）：调用 OpenAI 兼容 API，使用 `src/shared/ai-service.ts`，支持 DeepSeek/GPT-4o-mini 等

## 注意事项

- Content Script 使用 `chrome.scripting.executeScript` 注入扫描代码，不依赖预加载
- 填充失败时自动 fallback：先注入 content.js 再重试
- 表单扫描通过 `parentElement.closest(".ant-form-item")` 过滤嵌套项，兼容 Pro Components
