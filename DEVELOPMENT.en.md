# AI Form Copilot - Developer Guide

Chinese version: [DEVELOPMENT.md](./DEVELOPMENT.md)

This document is for contributors, maintainers, and secondary developers. End-user usage instructions are in [README.md](./README.md).

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript + Vite, with separate builds for Popup, Content Script, and Background
- React 19 for the Popup UI, with plain CSS and no UI framework
- OpenAI-compatible APIs, including OpenAI, DeepSeek, Kimi, Zhipu, Bailian, MiniMax, Volcengine Ark, SiliconFlow, Baichuan, and custom providers. If no API key is configured, built-in mock rules are used.
- Vitest + jsdom for regression tests

## Build From Source

```bash
npm install

# Full build: Popup + Content + Background. Output goes to dist/.
npm run build

# Popup-only development: start the Vite dev server.
# Content / Background still need to be built at least once.
npm run dev

# Regression tests
npm run test         # Run once
npm run test:watch   # Watch mode
```

After building, open `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `dist/` directory.

Build a single module:

```bash
npm run build:popup        # Build Popup UI only
npm run build:content      # Build Content Script only
npm run build:background   # Build Background Service Worker only
```

## Project Structure

```text
src/
├── popup/              # Popup UI (React + plain CSS)
│   ├── App.tsx         # Main UI: fill panel + settings panel + toast system
│   ├── main.tsx        # Entry
│   └── style.css       # Full styles: buttons, tags, forms, cards, switches, animation
├── background/         # Background Service Worker
│   └── index.ts        # Message routing + chrome.scripting injection + AI call proxy
├── content/            # Content Script injected into target pages for DOM operations
│   ├── index.ts        # Message listener entry with duplicate-injection guard
│   ├── scanner.ts      # Form field scanner: nested filtering, type detection, metadata extraction
│   └── antd-adapter.ts # Ant Design form filler adapter for interactive component simulation
├── shared/             # Shared modules for Popup / Background / Content
│   ├── types.ts        # FieldType / FormFieldInfo / FillData / Settings type definitions
│   ├── messages.ts     # Message type enum + TypeScript union interfaces
│   └── ai-service.ts   # OpenAI-compatible API calls: prompt construction + JSON parsing
└── utils/
    └── mock-rules.ts   # Built-in mock rule engine: keyword matching + crypto randomness + uniqueness
```

## AI Providers And Implementation

### Types And Storage

- `src/shared/types.ts`: `AiProvider` is a union type of `openai`, `deepseek`, `kimi`, `zhipu`, `bailian`, `minimax`, `volcengine`, `siliconflow`, `baichuan`, and `custom`. `AIConfig.provider` uses this type. `Settings.aiConfig` is persisted through `chrome.storage.local`.
- The default AI configuration is DeepSeek: `provider=deepseek`, `model=deepseek-v4-flash`, and `baseUrl=https://api.deepseek.com`. To embed your own DeepSeek key in a local build, create `.env.local` at the repository root, set `VITE_DEEPSEEK_API_KEY=your-key`, and run `npm run build`. `.env.local` is ignored by git; do not commit real keys.

### Popup Presets

`MODEL_PRESETS` and `PROVIDER_URLS` in `src/popup/App.tsx` define the provider-specific model dropdown options and default `baseUrl` values. The model dropdown keeps 2 to 3 common recent models for each provider and includes a "Custom" option for manually entering a model name. Users can also edit the API base URL directly, for example to use another region or a Volcengine `ep-xxxx` endpoint.

| `provider` | Display Name | Default `baseUrl` |
| --- | --- | --- |
| `openai` | OpenAI | `https://api.openai.com/v1` |
| `deepseek` | DeepSeek | `https://api.deepseek.com` |
| `kimi` | Kimi (Moonshot) | See `moonshot-kimi.ts`: `kimi-k2.6` / `kimi-k2.5` use the Anthropic-compatible `/anthropic` endpoint; other models use the OpenAI-compatible `/v1` endpoint. |
| `zhipu` | Zhipu GLM | `https://open.bigmodel.cn/api/paas/v4` |
| `bailian` | Alibaba Bailian | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `minimax` | MiniMax | `https://api.minimaxi.com/v1` |
| `volcengine` | Volcengine Ark | `https://ark.cn-beijing.volces.com/api/v3` |
| `siliconflow` | SiliconFlow | `https://api.siliconflow.cn/v1` |
| `baichuan` | Baichuan AI | `https://api.baichuan-ai.com/v1` |
| `custom` | Custom | Empty string. Filled by the user. |

Plans and model names can change. Use each provider console as the source of truth. Third-party summaries such as [AI Coding Plan Comparison](https://z4crk6mg95.coze.site/) can be useful references.

### Call Chain And Protocol

- `Popup` sends `GENERATE_DATA`; `background/index.ts` calls `generateWithAI(fields, aiConfig)` from `src/shared/ai-service.ts`.
- **Kimi**: if `baseUrl` is detected as Moonshot Anthropic style by `isMoonshotAnthropicStyleBase`, requests go to **`POST {base}/v1/messages`** with an Anthropic-shaped body. Otherwise, requests use the OpenAI-compatible **`POST {base}/chat/completions`** path.
- **Other built-in presets plus `custom`**: all use **`POST {baseUrl}/chat/completions`** with `Authorization: Bearer <apiKey>`, compatible with OpenAI-style APIs.
- **`response_format: { type: 'json_object' }`** is sent for every provider except **`minimax`**. Some MiniMax-compatible layers reject that field with 400, so MiniMax relies on the system prompt to return JSON. The parsing logic is shared.

## Implementation

### Overall Architecture

The extension uses Chrome Extension Manifest V3. Three separately running modules cooperate through message passing:

```text
┌────────────┐    chrome.runtime     ┌──────────────────┐    chrome.scripting     ┌──────────────────┐
│  Popup UI  │  <--------------->    │  Background SW   │  <------------------>   │  Content Script  │
│ (React)    │    sendMessage        │ (Service Worker) │    executeScript        │ (DOM operations) │
│            │                       │                  │    sendMessage          │                  │
│ scan button│  SCAN_FORM ------>    │ message routing  │  inject scan code -->   │ scanner.ts       │
│ generate   │  <---- SCAN_RESULT    │ AI API proxy     │  <---- field list       │ antd-adapter.ts  │
│ fill       │  FILL_FORM ------>    │ mock generation  │  FILL_FORM -------->    │ execute filling  │
│ settings   │  <---- FILL_RESULT    │                  │  <---- fill result      │                  │
└────────────┘                       └──────────────────┘                          └──────────────────┘
```

### Core Flow: Smart Fill

```text
User clicks "Smart Fill"
        |
        v
  1. Scan form fields
        |  Popup sends SCAN_FORM -> Background uses chrome.scripting.executeScript
        |  to inject scan code into the target page -> scans top-level .ant-form-item nodes
        |  -> returns the field list
        v
  2. Generate test data
        |  With API key -> Background calls an OpenAI-compatible AI API
        |  Without API key -> Popup uses mock-rules locally
        v
  3. Fill the form
        |  Popup sends FILL_FORM -> Background forwards to Content Script
        |  -> antd-adapter simulates user interactions by field type
        v
  Done. Return the number of successfully filled fields.
```

### Module 1: Form Scanner (`scanner.ts`)

The scanner detects Ant Design form fields on the page and returns a structured field list.

**1. Collect top-level form items and filter nested items**

```javascript
// Use the exact .ant-form-item class selector.
const all = document.querySelectorAll(".ant-form-item");
// Filter out child form-items nested inside another form-item.
const topLevel = all.filter(
  (item) => !item.parentElement?.closest(".ant-form-item"),
);
```

This handles Pro Components cases where `ProFormDependency` conditionally renders child form items inside containers such as Radio.Group. Nested items are not treated as independent fields, preventing field index drift.

**2. Detect field type by priority**

For each form-item container, CSS selectors are matched from highest to lowest priority:

| Priority | Selector | Field Type | Notes |
| --- | --- | --- | --- |
| 1 | `.ant-cascader` | cascader | Special components first to avoid Select misclassification. |
| 2 | `.ant-tree-select` | treeselect | |
| 3 | `.ant-transfer` | transfer | |
| 4 | `.ant-switch` | switch | |
| 5 | `.ant-select` | select | |
| 6 | `.ant-radio-group` | radio | |
| 7 | `.ant-checkbox-group` | checkbox | |
| 8 | `.ant-picker-range` | daterange | Must be before `.ant-picker`. |
| 9 | `.ant-picker` | date | |
| 10 | `.ant-input-number` | number | |
| 11 | `textarea.ant-input` | textarea | Before input to avoid misclassification. |
| 12 | `input.ant-input` | input | Most generic and lowest priority. |

**3. Extract field metadata**

- **Label**: read from `.ant-form-item-label label`, stripping required marks and colons.
- **Options**: Radio / Checkbox read direct wrapper span text to avoid picking up nested ProFormDependency content. Select reads selected option text.
- **Constraints**: extract `maxLength`, `min`, and `max` attributes.
- **Required**: check `.ant-form-item-required` class or `aria-required`.

### Module 2: Data Generation (`mock-rules.ts` + `ai-service.ts`)

**Mock rule engine** (no AI required):

```text
Field label -> regex match -> generator
  "Name"        -> /name|contact/       -> randomChineseName() -> "Zhang San"
  "Phone"       -> /phone|mobile/       -> randomPhone()       -> "13800138000"
  "Email"       -> /email/              -> randomEmail()       -> "user38271_k9f2@qq.com"
  "Plan time"   -> type=daterange       -> randomDateRange()   -> "2026-04-20,2026-06-15"
  unmatched     -> fallback by type     -> randomText/randInt/etc.
```

- Randomness uses `crypto.getRandomValues()` to avoid repeated pseudo-random values from `Math.random`.
- Code-like fields include a `Date.now().toString(36)` timestamp component for uniqueness.
- Select-family fields (`select`, `cascader`, `treeselect`, `transfer`) short-circuit before `LABEL_RULES`: if options exist, use `pickOne`; otherwise return `"random"`. This avoids generating unmatched text for async dropdowns whose labels contain words like `id` or `code`.

**AI mode** (enabled after configuring an API key):

AI is only used for generating test data. Scanning and filling are pure DOM operations and do not depend on AI.

1. Pack scanned field information such as label, type, options, and constraints into a structured prompt.
2. Call an OpenAI-compatible API, or Kimi's Anthropic-compatible branch. `response_format: json_object` is enabled by default, except for `minimax`.
3. Parse the returned JSON so each field ID maps to a generated value.

Difference between Mock and AI:

| | Without AI (Mock rules) | With AI (for example DeepSeek) |
| --- | --- | --- |
| Speed | Instant, local computation | Usually 1 to 3 seconds, network request |
| Common fields such as name / phone / email | Good, dedicated rules | Good |
| Domain-specific fields | Weak, often random text | Better semantic understanding |
| Cross-field relationships | None, fields are generated independently | Can understand relationships between fields |
| Network required | No | Yes |
| Cost | Free | Depends on provider, usually low for small prompts |

Example comparison for fields `Plan name`, `Execution setting`, and `Isolation setting`:

```text
Mock rules:
  Plan name         -> matches /name/ -> "Dingxin Technology Co., Ltd."  <- does not know whether it is a company or a plan
  Execution setting -> no rule        -> "test_k9f2_847"                 <- meaningless
  Isolation setting -> no rule        -> no data                         <- skipped

DeepSeek:
  Plan name         -> "Q2 user outreach frequency plan"                 <- understands it is a plan name
  Execution setting -> "Execute weekly"                                  <- understands field semantics
  Isolation setting -> "Strict isolation"                                <- understands context
```

AI is most valuable when a form contains domain-specific fields. It can generate meaningful test data instead of random strings. For professional admin forms such as campaign configuration, risk rules, or approval workflows, enabling AI can significantly improve data quality.

### Module 3: Form Filler Adapter (`antd-adapter.ts`)

The hardest part of filling is **React-controlled components**. Directly setting `input.value` does not trigger React's `onChange`, so the form state is not updated.

**Input / Textarea / Number filling principle:**

```javascript
// 1. Get the native value setter from HTMLInputElement.prototype.
const setter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
).set;
// 2. Set the value through the native setter, bypassing React's intercepted setter.
setter.call(inputElement, "Zhang San");
// 3. Dispatch events manually to trigger React's event system.
inputElement.dispatchEvent(new Event("input", { bubbles: true }));
inputElement.dispatchEvent(new Event("change", { bubbles: true }));
```

**Interactive components such as Select, DatePicker, and Cascader:**

The adapter simulates complete user interaction instead of directly mutating values:

```text
Select:      click selector -> wait for dropdown -> randomly choose an option -> click it
DatePicker:  click input -> wait for panel -> input date text -> click matching date cell
RangePicker: same as DatePicker, but process two inputs: start date + end date
Cascader:    click -> expand menu columns level by level -> choose random item until a leaf
Radio:       find matching option in radio-group -> click matching input[type=radio]
Switch:      read current state -> click only if state should change
Transfer:    randomly check 1 to 3 left-side items -> click move-right button
```

Between steps, the adapter waits with `await sleep(ms)` so asynchronous DOM updates, antd animations, and portal dropdowns are ready before the next action.

### Module 4: Message Protocol

The three modules communicate through `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`. All messages are strictly typed with TypeScript union types:

| Message Type | Direction | Payload |
| --- | --- | --- |
| SCAN_FORM | Popup -> Background | none |
| SCAN_RESULT | Background -> Popup | `{ fields: FormFieldInfo[] }` |
| GENERATE_DATA | Popup -> Background | `{ fields, aiConfig }` |
| GENERATE_RESULT | Background -> Popup | `{ data: FillData }` |
| FILL_FORM | Popup -> Background -> Content | `{ data: FillData }` |
| FILL_RESULT | Content -> Background -> Popup | `{ filledCount: number }` |

**Reliability safeguards:**

- Scanning uses `chrome.scripting.executeScript` to inject and execute code directly. It does not depend on a preloaded Content Script.
- Filling has a fallback mechanism: if `chrome.tabs.sendMessage` fails because the Content Script is not loaded, the background first injects `content.js` and then retries.

### Pro Components Compatibility

`@ant-design/pro-components` is rendered on top of antd components, so the DOM classes remain consistent, such as `.ant-form-item`, `.ant-picker`, and `.ant-select`. Compatibility relies on:

1. **Nested filtering**: `ProFormDependency` may conditionally render child form items inside a container. `parentElement.closest('.ant-form-item')` filters nested items.
2. **Clean option text extraction**: Radio / Checkbox wrappers read only direct span text and avoid nested ProFormDigit content.
3. **Precise selectors**: use `.ant-form-item` rather than `[class*="ant-form-item"]`, avoiding internal elements such as `.ant-form-item-control`.

## Testing

All regression cases are collected in `src/__tests__/failure-cases.test.ts` (Vitest + jsdom). Cases are appended as "Failure Case N" and cover previously missed scenarios across scan, mock, fill, and popup behavior. Run tests before and after new changes:

```bash
npm run test
```

Before every release command (`npm run build:prod*`), it is strongly recommended to run the full test suite to avoid regressions.

## Release Flow: Build Zip And Push Tag

Daily development only needs `npm run build`. For an official release, use one of the following semantic-version commands:

| Command | Version change, with `1.0.0` as example | Typical use |
| --- | --- | --- |
| `npm run build:prod` | `1.0.0 -> 1.0.1` (patch) | Bug fixes or compatibility patches |
| `npm run build:prod:minor` | `1.0.0 -> 1.1.0` (minor) | New failure-case coverage or new components |
| `npm run build:prod:major` | `1.0.0 -> 2.0.0` (major) | Breaking changes or protocol changes |

Each command performs **4 steps**. Step 4 internally runs `git add`, `commit`, `tag`, and `push`:

1. `npm version <level> --no-git-tag-version` updates only `package.json` / `package-lock.json`; it does **not** commit or tag automatically.
2. `npm run build` runs the three Vite configurations in order: Popup, Content, and Background. Output goes to `dist/`.
3. `npm run pack:dist` runs `scripts/pack-dist.mjs` and packages `dist/` into `releases/ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip` using the local timestamp. Multiple packages for the same version can accumulate under `releases/`.
4. `npm run publish:tag` runs `scripts/publish-tag.mjs`: it first `git add`s `package.json`, `package-lock.json` if present, and **`releases/` including the new zip**, then commits with **`git commit -m "chore: release v<version>"`**, creates tag **`v<version>`**, and finally runs **`git push`** plus **`git push origin v<version>`**. This guarantees that the remote repository contains the install package corresponding to the tag. If the tag already exists, the script exits to avoid overwriting history.

**Note**: do **not** add `releases/` to `.gitignore`, otherwise zip files cannot be added to the repository. If your team insists on ignoring binaries, adjust the release script instead of relying on this repository's default flow.

### Individual Commands

- `npm run pack:dist`: does not bump version, commit, or tag. It only packages the current `dist/` with the current version from `package.json`. Useful when build output did not change but a zip needs to be regenerated.
- `npm run publish:tag`: same as step 4 of the full release flow: `git add` including `releases/`, commit, tag, and push. Useful when build + pack already succeeded but push or tag failed.

### FAQ

- **How to recover from a build failure?** `--no-git-tag-version` keeps the version change only in the working tree and out of git. After failure, run `git checkout package.json package-lock.json` to revert.
- **First push needs upstream**: if the current branch has no upstream, `git push` reports `no upstream branch`. Run `git push -u origin <branch>` once; future pushes can use `git push`.
- **Undo a release**: `git tag -d v<version> && git reset --hard HEAD~1 && git push origin :refs/tags/v<version>`. The last command is only needed if the tag was pushed to the remote.
- **Historical zips**: `releases/` is not cleaned by `npm run build`. The release script commits all current changes under `releases/`. The remote repository can provide packages directly from `releases/`, or you can additionally attach them to GitLab / GitHub Releases.

## Failure Case Report Template

When a field cannot be scanned, cannot be filled, or generated Mock / AI data does not pass validation, open a new report with the template below. Whenever possible, include the corresponding `.ant-form-item` DOM or business code path (`file:line`) so a regression can be added to `src/__tests__/failure-cases.test.ts`.

**Cursor**: in chat, say **"failure case"** or **"failure case template"** to trigger the project skill **`ai-form-failure-case`** (`.cursor/skills/ai-form-failure-case/SKILL.md`) and have the assistant paste the same template for you to fill.

```markdown
Failure Case N

1. Page: <system/menu path, for example: Example System - List Management - Create>
2. Failed field (label): <form item label text>
3. Field type (as observed): <scanner type: input / textarea / select / radio / date / number ...>
4. Expected result: <how it should be filled or what rule it should satisfy>
5. Actual result: <current plugin behavior>
6. Key DOM: paste the complete `.ant-form-item` HTML for the field. If there is red validation text, also include `.ant-form-item-explain` / `#xxx_help` / `role="alert"` structure.
7. Business code (optional): `<repo>/path/to/File.tsx:start-end`, including ProForm field name, rules, and fieldProps.
8. Environment (optional): antd major version (4/5), Chrome version, Smart Fill or fill-only.
```
