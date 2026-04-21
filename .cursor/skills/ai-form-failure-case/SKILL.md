---
name: ai-form-failure-case
description: >-
  Outputs the AI Form Copilot failure-case report template in Chinese for the user to fill in.
  Use when the user mentions 失败案例, 失败案例模板, 添加失败案例, 表单填充失败, regression case,
  or wants to document a scan/fill/mock validation bug for this extension.
---

# AI Form Copilot：失败案例模板

## 何时使用

用户只要提到 **失败案例**、**失败案例模板**、**添加失败案例**、或描述「某字段填不上 / Mock 过不了校验 / 扫描不对」需要按固定格式记录时：**先完整输出下方模板**（用 markdown 代码块或可直接复制的正文），不要省略条目；编号里的 `N` 由用户自行递增。

## 必须输出的模板

将以下内容原样交给用户，占位符保持 `<>` 形式，便于用户替换：

```markdown
失败案例 N

1. 页面：<系统/菜单路径，如 营销中台-短链管理-新增>
2. 失败字段（label）：<表单项标签文案>
3. 字段类型（你看到的）：<scanner 识别的类型：input / textarea / select / radio / date / number …>
4. 期望结果：<应如何填或应满足什么规则>
5. 实际结果：<当前插件行为>
6. 关键 DOM：贴出问题字段所在整段 `.ant-form-item` HTML；若有红字，一并贴 `.ant-form-item-explain` / `#xxx_help` / `role="alert"` 结构
7. 业务代码（可选）：`<仓库>/path/to/File.tsx:起始行-结束行>`（含 ProForm 字段名、rules、fieldProps）
8. 环境（可选）：antd 主版本（4/5）、Chrome 版本、是否一键填充 / 仅填充
```

## 用户填完后的跟进（按需）

- 根据 DOM / 规则判断应改 `scanner.ts`、`antd-adapter.ts`、`mock-rules.ts`、`popup/App.tsx` 或 `ai-service.ts`。
- 在 `src/__tests__/marketing-plan-failure-cases.test.ts` 增加一条回归用例（jsdom 片段对齐真实 DOM）。
- 若模板正文有更新，与 `README.md` 中「失败案例汇报模板」一节保持同步。

## 单一职责

本技能**只负责**输出模板与简短跟进提示；具体改代码由用户在下一轮对话中带着已填模板继续。
