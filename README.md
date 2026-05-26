# AI Form Copilot

English | [简体中文](./README.zh-CN.md)

An intelligent browser extension for form filling. It automatically detects Ant Design forms and generates valid test data, helping developers, testers, product managers, operations users, and anyone who frequently fills forms in admin pages complete a whole form page with one click.

> For the full feature guide, see [docs/features.en.md](./docs/features.en.md). For implementation details, building from source, and release flow, see [DEVELOPMENT.en.md](./DEVELOPMENT.en.md).

## Installation

### Option 1: Download a prebuilt zip (recommended)

1. Download the latest `ai-form-copilot@<version>-<YYYYMMDD-HHmmss>.zip` from the repository [releases/ directory](./releases).
2. Extract it to any local directory. Make sure the directory contains `manifest.json`.
3. Open Chrome, go to `chrome://extensions/`, and enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the extracted folder from step 2.

### Option 2: Build from source

Run `npm install && npm run build`, then load the `dist/` directory in Chrome. For details, see [DEVELOPMENT.en.md](./DEVELOPMENT.en.md).

## UI Language

The plugin UI uses **English** by default. To switch to Chinese, open the Popup and go to **Settings -> Language**, then select **Simplified Chinese**.

The language setting is saved in browser local storage and remains active when the Popup is reopened. For more details, see [Features - Language Settings](./docs/features.en.md#language-settings).

## Features

> This README keeps only the core feature summary. For the full guide, see [docs/features.en.md](./docs/features.en.md).

| Feature                            | Description                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Automatic form scanning**        | Detects **14 types** of common Ant Design controls: Input, Textarea, Select, Radio, Checkbox, DatePicker, RangePicker, TimePicker, InputNumber, Cascader, TreeSelect, Switch, Transfer, and more.                              |
| **AI data generation**             | Includes presets for OpenAI, DeepSeek, Kimi, Zhipu, Bailian, MiniMax, Volcengine Ark, SiliconFlow, Baichuan, and custom Base URLs. It generates Chinese test data from labels, placeholders, and validation rules.             |
| **Built-in mock rules**            | Works without AI. Keyword rules cover names, phone numbers, emails, ID numbers, addresses, companies, dates, times, amounts, codes, and more. It also derives character sets from HTML `pattern` and "only contains..." hints. |
| **Smart Fill**                     | Runs "scan -> generate -> fill" in one step, or lets you run each step manually.                                                                                                                                               |
| **Fill from pasted text**          | Maps source text to page fields and fills matched form items directly.                                                                                                                                                         |
| **Multi-pass correction**          | Reads visible validation errors such as `.ant-form-item-explain-error` and `role="alert"`, then feeds them into the next generation pass until the form passes validation.                                                     |
| **UI language switching**          | The settings page supports English / Simplified Chinese. English is the default language.                                                                                                                                      |
| **Pro / React compatibility**      | Supports `@ant-design/pro-components`; bypasses React-controlled `input.value` interception and correctly triggers `onChange`.                                                                                                 |
| **antd 4 / 5+ / 6+ compatibility** | Covers DOM differences across versions, such as `.ant-select-selection` / `.ant-select-selector` and dropdown item classes.                                                                                                    |

## Usage

1. Open a page that contains an Ant Design form.
2. Click the AI Form Copilot icon in the browser toolbar to open the Popup.
3. Click **Smart Fill** to complete the flow in one step, or run the steps manually:
   - **Scan**: lists all detected fields on the page, including label, type, required status, current value, and validation error.
   - **Generate data**: generates data using the current configuration (Mock / AI) and previews it in the Popup.
   - **Fill**: writes the generated values back to the form and returns the number of fields filled in this round.
4. If the page shows red validation errors after submission, click **Smart Fill** again. The plugin will feed the validation messages into the next generation pass until the form passes.

## Configure AI

The plugin **uses DeepSeek V4 Flash by default** and works out of the box. To use your own DeepSeek key or switch to another provider, open the **Settings** tab in the Popup.

| Provider                          | Description                                                                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DeepSeek (built in)**           | Selected by default and usable without a key. You can also enter your own API key. Default base URL: `https://api.deepseek.com`; model options: `deepseek-v4-flash` / `deepseek-v4-pro`.                                                                               |
| **OpenAI**                        | Enter an API key. Default base URL: `https://api.openai.com/v1`; model options include `gpt-5.5` / `gpt-5.4` / `gpt-5.4-mini`.                                                                                                                                         |
| **Kimi (Moonshot)**               | Enter an API key. `kimi-k2.6` / `kimi-k2.5` use the **Anthropic-compatible `/anthropic`** endpoint; other models use the **OpenAI-compatible `/v1`** endpoint. See `src/shared/moonshot-kimi.ts`; model list: [Kimi model list](https://platform.kimi.ai/docs/models). |
| **Zhipu GLM**                     | Enter an API key. Default base URL: `https://open.bigmodel.cn/api/paas/v4`; model options: `glm-4.6` / `glm-4.5` / `glm-4-flash`.                                                                                                                                      |
| **Alibaba Bailian (DashScope)**   | Enter an API key. Default base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`; model options: `qwen3-max` / `qwen3.5-plus` / `qwen3-coder-plus`.                                                                                                             |
| **MiniMax**                       | Enter an API key. Default base URL: `https://api.minimaxi.com/v1`; model options: `MiniMax-M2.7` / `MiniMax-M2.7-highspeed` / `MiniMax-M2.5`.                                                                                                                          |
| **Volcengine Ark (Doubao, etc.)** | Enter an API key. Default base URL: `https://ark.cn-beijing.volces.com/api/v3`; model options: `doubao-seed-1-6-250615` / `doubao-seed-1-6-thinking-250615` / `doubao-seed-1-6-flash-250915`. Use the actual inference endpoint / model name from the console.         |
| **SiliconFlow**                   | Enter an API key. Default base URL: `https://api.siliconflow.cn/v1`; model options: `deepseek-ai/DeepSeek-V3.2` / `Qwen/Qwen3-235B-A22B-Instruct-2507` / `Qwen/Qwen3-Coder-480B-A35B-Instruct`.                                                                        |
| **Baichuan AI**                   | Enter an API key. Default base URL: `https://api.baichuan-ai.com/v1`; model options: `Baichuan4-Turbo` / `Baichuan4-Air` / `Baichuan3-Turbo`.                                                                                                                          |
| **Custom**                        | Any OpenAI-compatible Base URL plus model name, such as a private gateway or a Volcengine `ep-xxxx` endpoint. Select "Custom" in the model dropdown to enter a model name directly.                                                                                    |

- Platform plans and model names may change. The dropdown only keeps common defaults. For broader comparisons, see [AI Coding Plan comparison for major Chinese AI platforms](https://z4crk6mg95.coze.site/).
- For **Volcengine Ark**, if you use an **endpoint ID** (`ep-xxxx`) from the console as the model name, or if your Base URL differs from the default Beijing region, use **Custom** and enter the full **API base URL** and **model**.

> Without an AI API key, the plugin uses built-in mock rules to generate data. It already handles common fields well, such as names, phone numbers, emails, ID numbers, addresses, dates, amounts, and codes. AI is most useful for semantically complex fields such as "campaign name", "rule configuration", or "source code", where context is needed.

Implementation details such as `AiProvider` and the MiniMax `response_format` exception are in [DEVELOPMENT.en.md](./DEVELOPMENT.en.md).

## Supported Ant Design Components

> Supports both native antd components and `@ant-design/pro-components` such as ProFormText, ProFormSelect, and ProFormDateRangePicker.

### Supported (14 Types)

| Component       | Type       | Scan | Fill | Fill Strategy                                                                                                |
| --------------- | ---------- | ---- | ---- | ------------------------------------------------------------------------------------------------------------ |
| Input           | input      | Yes  | Yes  | Uses the native `valueSetter` plus `input` / `change` events to bypass React-controlled components.          |
| Input.TextArea  | textarea   | Yes  | Yes  | Same as Input.                                                                                               |
| Input.Password  | input      | Yes  | Yes  | Detected via `.ant-input-affix-wrapper`; fill strategy is the same as Input.                                 |
| InputNumber     | number     | Yes  | Yes  | Operates on the internal `.ant-input-number-input`.                                                          |
| Select          | select     | Yes  | Yes  | Simulates opening the dropdown, randomly selecting an available option, and clicking it.                     |
| Radio           | radio      | Yes  | Yes  | Finds the target option in `.ant-radio-group` and clicks the corresponding `input[type=radio]`.              |
| Checkbox        | checkbox   | Yes  | Yes  | Supports single Checkbox and Checkbox.Group by clicking the corresponding `input[type=checkbox]`.            |
| DatePicker      | date       | Yes  | Yes  | Opens the panel, enters date text, and clicks the matching date cell in the panel.                           |
| DateRangePicker | daterange  | Yes  | Yes  | Detects `.ant-picker-range` and infers whether `format` includes time from `input.size`.                     |
| TimePicker      | time       | Yes  | Yes  | Reuses `.ant-picker`, selects time columns, and confirms with the OK button.                                 |
| Cascader        | cascader   | Yes  | Yes  | Simulates opening the cascader panel, randomly selecting menu items level by level until a leaf is selected. |
| TreeSelect      | treeselect | Yes  | Yes  | Simulates opening the dropdown, randomly expanding nodes, and selecting a tree node.                         |
| Switch          | switch     | Yes  | Yes  | Reads current switch state and clicks only when needed based on the generated value.                         |
| Transfer        | transfer   | Yes  | Yes  | Randomly checks 1 to 3 items from the left list and clicks the move-right button.                            |

### Not Yet Supported (4 Types)

| Component    | Reason                                                                                 | Difficulty | Plan            |
| ------------ | -------------------------------------------------------------------------------------- | ---------- | --------------- |
| AutoComplete | DOM is similar to Select but requires typing to trigger async search before selecting. | Medium     | To be supported |
| Slider       | Requires simulating drag or track click to set a value.                                | Medium     | To be evaluated |
| Rate         | Requires clicking the corresponding star icon.                                         | Low        | To be supported |
| Mentions     | Similar to Input but includes an `@` triggered popup panel.                            | Medium     | To be evaluated |

### Not Applicable (2 Types)

| Component   | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| Upload      | File upload requires real files and is outside text data filling. |
| ColorPicker | New in Ant Design 5 and not available in antd 4.                  |

### Third-party Components

| Component                    | Scan               | Fill | Description                                                                            |
| ---------------------------- | ------------------ | ---- | -------------------------------------------------------------------------------------- |
| React Quill rich text editor | Detected as custom | No   | Rich text editor interactions are complex and not supported for automatic filling yet. |

## Report Issues

If a field cannot be scanned, cannot be filled, or generated Mock / AI data fails validation, you can report it using this template.

```markdown
Failure Case N

1. Page: <system/menu path, for example: Example System - List Management - Create>
2. Failed field (label): <form item label text>
3. Field type (as observed): <scanner type: input / textarea / select / radio / date / number ...>
4. Expected result: <how it should be filled or what rule it should satisfy>
5. Actual result: <current plugin behavior>
6. Key DOM: paste the complete `.ant-form-item` HTML for the field. If there is red validation text, also include `.ant-form-item-explain` / `#xxx_help` / `role="alert"` structure.
7. Business code (optional): `<repo>/path/to/File.tsx:start-end` including ProForm field name, rules, and fieldProps.
8. Environment (optional): antd major version (4/5), Chrome version, Smart Fill or fill-only.
```

## Final Notes

If you find this project useful, a Star is welcome. If you are interested in contributing or sharing suggestions, feel free to contact me at `zhulinger520@163.com`. Thank you.

If you would like to support the project, WeChat donation is also welcome.

![WeChat donation](./public/wechat-donate.png)
