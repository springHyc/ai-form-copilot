# AI Form Copilot Features

AI Form Copilot is a Chrome Extension MV3 plugin that automatically detects Ant Design forms and generates test data. It is designed for developers, testers, product managers, and anyone who frequently fills forms in admin pages.

> Installation and build instructions are in [README.md](../README.md). Implementation details are in [DEVELOPMENT.en.md](../DEVELOPMENT.en.md).

## Feature Overview

| Feature | Description |
| --- | --- |
| Automatic form scanning | Detects Ant Design form items on the page and extracts labels, types, required status, options, current values, and validation errors. |
| Smart Fill | Runs scan, data generation, and form filling as one flow, suitable for quickly filling an entire form page. |
| Step-by-step actions | Supports running scan, data generation, and fill separately, which helps debug field detection or filling issues. |
| Fill from pasted text | Maps source text to page fields and fills matched form items directly. |
| AI data generation | Supports OpenAI, DeepSeek, Kimi, Zhipu, Bailian, MiniMax, Volcengine Ark, SiliconFlow, Baichuan, and custom OpenAI-compatible APIs. |
| Built-in mock rules | Generates common test data without an API key, covering fields such as names, phone numbers, emails, addresses, dates, times, amounts, and IDs. |
| Multi-pass correction | Reads visible validation errors on the page and uses them as hints in the next data generation pass. |
| UI language switching | The settings page supports English and Simplified Chinese. English is the default language. |

## Popup Panels

The Popup has two tabs:

| Tab | Description |
| --- | --- |
| Fill | Runs Smart Fill, fill from pasted text, scan, data generation, and fill. It also shows detected fields and generated values. |
| Settings | Configures UI language, AI provider, API key, model, API base URL, and whether to use built-in rules when AI is unavailable. |

## Data Generation Modes

### AI Mode

After an API key is configured, the plugin sends the scanned field information to the selected AI service. The AI generates test data based on field semantics, options, placeholders, constraints, and validation errors.

This mode is useful when fields are not easy to infer from fixed keywords, when fields depend on page context, or when relationships between fields matter.

### Mock Mode

When no API key is configured, the plugin uses local built-in rules to generate test data without network access.

Mock rules work well for common fields such as names, phone numbers, emails, addresses, dates, times, amounts, and IDs. For interactive components such as Select, Cascader, and TreeSelect without visible options, the fill phase opens the dropdown and randomly selects from the actual page options.

## Supported Components

The plugin focuses on Ant Design forms and common Pro Components forms:

| Type | Component Examples |
| --- | --- |
| Text input | Input, Input.Password, Input.TextArea |
| Number input | InputNumber |
| Single / multiple choice | Radio, Checkbox |
| Selection | Select, Cascader, TreeSelect, Transfer |
| Date and time | DatePicker, RangePicker, TimePicker |
| Switch | Switch |

For the full component support matrix, see [README.md - Supported Ant Design Components](../README.md#supported-ant-design-components).

## Language Settings

The settings page includes a language selector:

| Option | Description |
| --- | --- |
| English | Default language. |
| Simplified Chinese | Chinese UI text. |

The language setting is saved in `chrome.storage.local`, so it remains active when the Popup is reopened.

Saved settings from older versions that do not include a language field are automatically completed with the default language: English.
