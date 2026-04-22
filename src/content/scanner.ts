import type { FieldType, FormFieldInfo } from "@/shared/types";

/**
 * 纯 TimePicker（无日期）：与 DatePicker 共用 .ant-picker，需与日历区分。
 * 用于同一 Form.Item 内 Select + ProFormTimePicker（如营销计划「执行时间」）。
 */
export function isTimeOnlyPickerEl(picker: HTMLElement): boolean {
  if (picker.classList.contains("ant-picker-range")) return false;
  const input = picker.querySelector<HTMLInputElement>(
    ".ant-picker-input input",
  );
  const ph = input?.getAttribute("placeholder")?.trim() ?? "";
  if (/请选择时间|时分秒|时\s*分|HH:mm/i.test(ph)) return true;
  if (
    picker.querySelector(".anticon-clock-circle") &&
    !picker.querySelector(".anticon-calendar")
  ) {
    return true;
  }
  return false;
}

/**
 * 枚举同一 .ant-form-item 内所有可独立填充的控件（后台常见：一个 Form.Item 里多个 Pro 子项）。
 * 顺序为文档序。
 *
 * 去重原则：
 *   仅「复合控件」(cascader / treeselect / transfer) 会在内部复用原子控件（如内嵌 .ant-select / input），
 *   这种情况才把嵌套候选丢掉；其它容器（radio-group / checkbox-group / picker 等）即便 DOM 上包住子字段，
 *   也要保留子字段——否则像 jarvis `Radio.Group` 内条件渲染的 `ProFormDigit / ProFormDateTimePicker`
 *   会被外层 radio-group 吞掉而漏扫。
 */
const COMPOSITE_WRAPPER_TYPES: FieldType[] = [
  "cascader",
  "treeselect",
  "transfer",
];
export function enumerateControlsInFormItem(
  container: HTMLElement,
): { type: FieldType; element: HTMLElement }[] {
  const control =
    container.querySelector<HTMLElement>(".ant-form-item-control") ?? container;

  type Cand = { type: FieldType; element: HTMLElement };
  const raw: Cand[] = [];

  const push = (type: FieldType, el: HTMLElement) => {
    if (!isVisible(el) || !container.contains(el)) return;
    if (raw.some((r) => r.element === el)) return;
    raw.push({ type, element: el });
  };

  const addEach = (sel: string, type: FieldType) => {
    control.querySelectorAll<HTMLElement>(sel).forEach((el) => push(type, el));
  };

  addEach(".ant-cascader", "cascader");
  addEach(".ant-tree-select", "treeselect");
  addEach(".ant-transfer", "transfer");
  addEach(".ant-switch", "switch");
  addEach(".ant-select", "select");
  addEach(".ant-radio-group", "radio");
  addEach(".ant-checkbox-group", "checkbox");

  control
    .querySelectorAll<HTMLElement>(".ant-checkbox-wrapper")
    .forEach((el) => {
      if (el.closest(".ant-checkbox-group")) return;
      push("checkbox", el);
    });

  control
    .querySelectorAll<HTMLElement>(
      ".ant-picker.ant-picker-range, .ant-picker-range",
    )
    .forEach((el) => push("daterange", el));

  control
    .querySelectorAll<HTMLElement>(".ant-picker:not(.ant-picker-range)")
    .forEach((el) => {
      push(isTimeOnlyPickerEl(el) ? "time" : "date", el);
    });

  addEach(".ant-input-number", "number");

  control
    .querySelectorAll<HTMLTextAreaElement>("textarea.ant-input, textarea")
    .forEach((el) => push("textarea", el));

  addEach(".ant-input-affix-wrapper", "input");

  control
    .querySelectorAll<HTMLInputElement>("input.ant-input")
    .forEach((inp) => {
      if (inp.closest(".ant-picker")) return;
      if (inp.closest(".ant-input-number")) return;
      if (inp.closest(".ant-select")) return;
      if (inp.closest(".ant-input-affix-wrapper")) return;
      push("input", inp);
    });

  raw.sort((a, b) => {
    const pos = a.element.compareDocumentPosition(b.element);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  const out: Cand[] = [];
  for (const c of raw) {
    const swallowedByComposite = raw.some(
      (a) =>
        a !== c &&
        COMPOSITE_WRAPPER_TYPES.includes(a.type) &&
        a.element.contains(c.element),
    );
    if (swallowedByComposite) continue;
    if (out.some((a) => a.element === c.element)) continue;
    out.push(c);
  }

  return out;
}

/** 尝试从字段元素中提取可用的标识（name / id） */
function extractFieldIdentifier(
  element: HTMLElement,
  container: HTMLElement,
): string | undefined {
  const direct = element.matches("input, textarea, select")
    ? (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
    : element.querySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input, textarea, select");

  const candidate =
    direct?.getAttribute("name") ||
    direct?.getAttribute("id") ||
    element.getAttribute("name") ||
    element.getAttribute("id") ||
    container.getAttribute("data-name");

  return candidate?.trim() || undefined;
}

/** 从 Ant Design 表单项容器中提取标签文本 */
function extractLabel(container: HTMLElement): string {
  // 只查找当前 form-item 自己的 label，不要拿到嵌套 form-item 的 label
  const labelEl =
    container.querySelector(":scope > .ant-row > .ant-form-item-label label") ??
    container.querySelector(":scope > .ant-form-item-label label") ??
    container.querySelector(".ant-form-item-label label");
  if (labelEl) {
    return (labelEl.textContent?.trim() ?? "")
      .replace(/^\*\s*/, "")
      .replace(/[：:]$/, "");
  }

  // 兜底：直接查找直属 label 标签
  const fallbackLabel =
    container.querySelector(":scope > .ant-row label") ??
    container.querySelector("label");
  if (fallbackLabel) {
    return (fallbackLabel.textContent?.trim() ?? "")
      .replace(/^\*\s*/, "")
      .replace(/[：:]$/, "");
  }

  return "";
}

/** 提取 Form.Item 的 extra（表单项下方灰色提示文案） */
function extractExtra(container: HTMLElement): string | undefined {
  const el = container.querySelector(".ant-form-item-extra");
  const text = el?.textContent?.trim();
  return text || undefined;
}

/** 从文案中推断「最大字符数」（如「不超过10个字符」） */
function inferMaxLenFromHints(text: string): number | undefined {
  const compact = text.replace(/\s+/g, "");
  const patterns = [
    /不超过(\d{1,4})个?字符/,
    /至多(\d{1,4})个?字符/,
    /最多(\d{1,4})个?字符/,
    /不大于(\d{1,4})个?字符/,
    /长度不超过(\d{1,4})/,
    /最长(\d{1,4})个?字符/,
    /≤\s*(\d{1,4})\s*个?字符/,
    /不能超过(\d{1,4})个?字/,
    /不超过(\d{1,4})个?字/,
    /至多(\d{1,4})个?字/,
    /最多(\d{1,4})个?字/,
    /长度为(\d{1,4})个?字以内/,
  ];
  for (const re of patterns) {
    const m = compact.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/** 收集 label 区域 tooltip / title 等可见规则说明 */
function collectVisibleRuleTexts(container: HTMLElement): string[] {
  const out: string[] = [];
  const push = (s?: string | null) => {
    const t = (s ?? "").trim();
    if (t && !out.includes(t)) out.push(t);
  };

  // ProForm tooltip 常见：问号图标带 title
  container
    .querySelectorAll<HTMLElement>(
      ".ant-form-item-label [title], .ant-form-item-label [aria-label], .ant-form-item-tooltip, .anticon[title]",
    )
    .forEach((el) => {
      push(
        el.getAttribute("title") ||
          el.getAttribute("aria-label") ||
          el.textContent,
      );
    });

  return out;
}

/** 当前表单项上已展示的校验错误（若页面尚未触发校验则可能为空） */
function extractValidationError(container: HTMLElement): string | undefined {
  const parts: string[] = [];
  const push = (t?: string | null) => {
    const s = (t ?? "").trim();
    if (s && !parts.includes(s)) parts.push(s);
  };

  /**
   * antd：错误文案常在 .ant-form-item-explain-connected + role="alert" 内再包一层
   * .ant-form-item-explain-error（外圈可能还有 flex 包裹，仍在 .ant-form-item 下）。
   */
  const explainErrorSelectors = [
    ".ant-form-item-explain-error",
    ".ant-form-item-explain-connected .ant-form-item-explain-error",
    '[role="alert"] .ant-form-item-explain-error',
    ".ant-form-item-has-error .ant-form-item-explain-error",
  ];
  for (const sel of explainErrorSelectors) {
    container
      .querySelectorAll<HTMLElement>(sel)
      .forEach((el) => push(el.textContent));
  }

  /**
   * 控件 aria-describedby / aria-errormessage 常指向 #xxx_help，该区域可能在表单项外（portal 等），
   * 必须用 document.getElementById；仅在 has-error 或 aria-invalid 时当作校验错误，避免把普通说明当成错。
   */
  const hasErrStyle = container.classList.contains("ant-form-item-has-error");
  if (parts.length === 0) {
    container
      .querySelectorAll<HTMLElement>("input, textarea, select")
      .forEach((ctrl) => {
        const invalid = ctrl.getAttribute("aria-invalid") === "true";
        if (!invalid && !hasErrStyle) return;
        const ids =
          ctrl.getAttribute("aria-errormessage") ??
          ctrl.getAttribute("aria-describedby");
        if (!ids?.trim()) return;
        for (const rawId of ids.trim().split(/\s+/)) {
          const id = rawId.replace(/^#/, "");
          if (!id) continue;
          const region = document.getElementById(id);
          if (!region) continue;
          const nested = region.querySelectorAll<HTMLElement>(
            ".ant-form-item-explain-error",
          );
          if (nested.length > 0) nested.forEach((el) => push(el.textContent));
          else push(region.textContent);
        }
      });
  }

  if (parts.length > 0) return parts.join("；");

  // antd 4 等：仅有 .ant-form-item-explain，无独立 -error 子类
  if (hasErrStyle) {
    container
      .querySelectorAll<HTMLElement>(".ant-form-item-explain")
      .forEach((el) => {
        const t = el.textContent?.trim();
        if (t) push(t);
      });
    if (parts.length > 0) return parts.join("；");

    const help = container.querySelector<HTMLElement>(
      ".ant-form-item-explain-connected",
    );
    const helpText = help?.textContent?.trim();
    if (helpText) return helpText;
    return "校验未通过";
  }

  return undefined;
}

/**
 * 业务侧可在 Form.Item 根节点挂 data-ai-pattern / data-pattern（与 rules.pattern 同形字符串），
 * 以便首轮扫描即可读到（React rules 默认不落 DOM）。
 */
function extractDataPatternFromContainer(
  container: HTMLElement,
): string | undefined {
  const names = [
    "data-ai-pattern",
    "data-ai-valid-pattern",
    "data-pattern",
    "data-rule-pattern",
  ] as const;
  for (const name of names) {
    const v = container.getAttribute(name)?.trim();
    if (v) return v;
  }
  const marked = container.querySelector<HTMLElement>(
    "[data-ai-pattern], [data-pattern]",
  );
  if (marked) {
    for (const name of names) {
      const v = marked.getAttribute(name)?.trim();
      if (v) return v;
    }
  }
  return undefined;
}

/** 合并 DOM 推断的 maxLength 与 input 上的 maxLength */
function mergeConstraintsWithHints(
  base: FormFieldInfo["constraints"] | undefined,
  hintsText: string,
): FormFieldInfo["constraints"] | undefined {
  const inferred = inferMaxLenFromHints(hintsText);
  if (inferred === undefined) return base;

  const merged: NonNullable<FormFieldInfo["constraints"]> = { ...(base ?? {}) };
  if (merged.maxLength === undefined || inferred < merged.maxLength) {
    merged.maxLength = inferred;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** 检测字段是否必填 */
function isRequired(container: HTMLElement): boolean {
  if (container.querySelector(".ant-form-item-required")) return true;
  const input = container.querySelector("input, select, textarea");
  if (input?.getAttribute("aria-required") === "true") return true;
  if ((input as HTMLInputElement)?.required) return true;
  return false;
}

/**
 * 提取 Radio / Checkbox 选项文本。
 * 只提取 wrapper 自身的直属文本，避免拾取到嵌套的 ProFormDependency 内容。
 */
function extractOptions(
  container: HTMLElement,
  type: FieldType,
  fieldElement?: HTMLElement,
): string[] {
  if (type === "radio") {
    const root = fieldElement?.classList.contains("ant-radio-group")
      ? fieldElement
      : (fieldElement?.closest(".ant-radio-group") ??
        container.querySelector(".ant-radio-group") ??
        container);
    return Array.from(root.querySelectorAll(".ant-radio-wrapper"))
      .map((el) => {
        const textSpan = el.querySelector(":scope > span:not(.ant-radio)");
        return textSpan?.textContent?.trim() ?? el.textContent?.trim() ?? "";
      })
      .filter(Boolean);
  }

  if (type === "checkbox") {
    const el = fieldElement;
    if (el?.classList.contains("ant-checkbox-group")) {
      return Array.from(el.querySelectorAll(".ant-checkbox-wrapper"))
        .map((w) => {
          const textSpan = w.querySelector(":scope > span:not(.ant-checkbox)");
          return textSpan?.textContent?.trim() ?? w.textContent?.trim() ?? "";
        })
        .filter(Boolean);
    }
    if (el?.classList.contains("ant-checkbox-wrapper")) {
      const textSpan = el.querySelector(":scope > span:not(.ant-checkbox)");
      const t = textSpan?.textContent?.trim() ?? el.textContent?.trim() ?? "";
      return t ? [t] : [];
    }
    return Array.from(container.querySelectorAll(".ant-checkbox-wrapper"))
      .map((w) => {
        const textSpan = w.querySelector(":scope > span:not(.ant-checkbox)");
        return textSpan?.textContent?.trim() ?? w.textContent?.trim() ?? "";
      })
      .filter(Boolean);
  }

  if (type === "select") {
    const selectEl = fieldElement?.classList.contains("ant-select")
      ? fieldElement
      : (fieldElement?.closest(".ant-select") ??
        container.querySelector(".ant-select"));
    const selectedText =
      selectEl
        ?.querySelector(".ant-select-selection-item")
        ?.textContent?.trim() ??
      selectEl
        ?.querySelector(".ant-select-selection-selected-value")
        ?.textContent?.trim();
    if (!selectedText) return [];
    // antd Select 常把「请选择...」渲染为当前展示文本（甚至 value='' 的首项），这不是可用业务选项
    if (isSelectPlaceholderText(selectedText)) return [];
    return [selectedText];
  }

  return [];
}

/** Select 展示文案是否是占位/空值语义（非真实已选项） */
function isSelectPlaceholderText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return /^(请(先)?选择|请选择|请选|Select)/i.test(t);
}

/** 提取字段约束信息（InputNumber 取 .ant-input-number-input 上的 min/max；input/textarea 取 pattern） */
function extractConstraints(
  element: HTMLElement,
  fieldType: FieldType,
): FormFieldInfo["constraints"] | undefined {
  let input: HTMLInputElement | HTMLTextAreaElement | null = null;
  if (fieldType === "number") {
    input =
      element.querySelector<HTMLInputElement>(".ant-input-number-input") ??
      (element.tagName === "INPUT" ? (element as HTMLInputElement) : null);
  } else if (fieldType === "textarea") {
    input =
      element.tagName === "TEXTAREA"
        ? (element as HTMLTextAreaElement)
        : element.querySelector<HTMLTextAreaElement>(
            "textarea.ant-input, textarea",
          );
  } else if (element.tagName === "INPUT") {
    input = element as HTMLInputElement;
  } else {
    input =
      element.querySelector<HTMLInputElement>("input") ??
      element.querySelector<HTMLTextAreaElement>("textarea");
  }
  if (!input) return undefined;

  const constraints: FormFieldInfo["constraints"] = {};
  if (input.maxLength > 0 && input.maxLength < 524288) {
    constraints.maxLength = input.maxLength;
  }
  const minAttr = input.getAttribute("min");
  const maxAttr = input.getAttribute("max");
  if (minAttr !== null && minAttr !== "" && !Number.isNaN(Number(minAttr))) {
    constraints.min = Number(minAttr);
  }
  if (maxAttr !== null && maxAttr !== "" && !Number.isNaN(Number(maxAttr))) {
    constraints.max = Number(maxAttr);
  }
  const pat = input.getAttribute("pattern");
  if (pat?.trim()) {
    constraints.pattern = pat.trim();
  }

  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

/** 判断元素是否可见 */
function isVisible(el: HTMLElement): boolean {
  if (!el) return false;
  const style = getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }
  if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

/**
 * 收集页面中所有顶层 .ant-form-item，过滤掉嵌套在其他 form-item 内部的子项。
 *
 * 核心问题：ProFormDependency、ProFormGroup 等 Pro Components 会在 Radio.Group /
 * Checkbox.Group 等容器内部嵌套 .ant-form-item（如条件显示的 ProFormDigit）。
 * 如果不过滤，这些嵌套项会被当成独立字段，导致：
 *   1. 字段数量膨胀
 *   2. field_N 索引错位
 *   3. 生成的数据填到错误的字段上
 */
function collectTopLevelFormItems(): HTMLElement[] {
  // 只用精确的 .ant-form-item 类名，避免 [class*="ant-form-item"] 误匹配
  // .ant-form-item-control / .ant-form-item-row / .ant-form-item-label 等内部元素
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(".ant-form-item"),
  );

  return all.filter((item) => {
    // 向上查找：如果存在另一个 .ant-form-item 祖先，说明是嵌套的
    const ancestor = item.parentElement?.closest(".ant-form-item");
    return !ancestor;
  });
}

/** 扫描页面中所有 Ant Design 表单字段 */
export function scanFormFields(): FormFieldInfo[] {
  const formItems = collectTopLevelFormItems();
  const fields: FormFieldInfo[] = [];
  let fieldIndex = 0;

  console.log(
    `[AI Form Copilot] 找到 ${formItems.length} 个顶层 .ant-form-item 容器`,
  );

  for (const container of formItems) {
    if (!isVisible(container)) continue;

    const controls = enumerateControlsInFormItem(container);
    if (controls.length === 0) continue;

    const baseLabel = extractLabel(container);
    const baseExtra = extractExtra(container);
    const required = isRequired(container);

    const pushField = (
      type: FieldType,
      element: HTMLElement,
      labelSuffix = "",
    ) => {
      const placeholder =
        element.getAttribute("placeholder") ??
        element.querySelector("input")?.getAttribute("placeholder") ??
        undefined;
      const identifier = extractFieldIdentifier(element, container);

      const base = baseLabel || placeholder || identifier;
      if (!base) return;

      const visibleRuleParts = collectVisibleRuleTexts(container);
      const validationError = extractValidationError(container);
      const ruleHints =
        [...visibleRuleParts, placeholder, baseExtra]
          .filter(Boolean)
          .join("；")
          .slice(0, 800) || undefined;

      const options = extractOptions(container, type, element);
      let rawConstraints = extractConstraints(element, type);
      const dataPattern = extractDataPatternFromContainer(container);
      if (dataPattern && !rawConstraints?.pattern) {
        rawConstraints = { ...(rawConstraints ?? {}), pattern: dataPattern };
      }
      const constraints = mergeConstraintsWithHints(
        rawConstraints,
        `${ruleHints ?? ""}${validationError ? `；${validationError}` : ""}`,
      );
      let currentValue: string | undefined;

      if (type === "input" || type === "textarea" || type === "number") {
        const inputEl =
          element.tagName === "INPUT" || element.tagName === "TEXTAREA"
            ? (element as HTMLInputElement | HTMLTextAreaElement)
            : ((element.querySelector("input") ??
                element.querySelector("textarea")) as
                | HTMLInputElement
                | HTMLTextAreaElement
                | null);
        currentValue = inputEl?.value || undefined;
      } else if (type === "select") {
        const selRoot = element.classList.contains("ant-select")
          ? element
          : element.closest(".ant-select");
        const selectedText =
          selRoot
            ?.querySelector(".ant-select-selection-item")
            ?.textContent?.trim() ||
          selRoot
            ?.querySelector(".ant-select-selection-selected-value")
            ?.textContent?.trim() ||
          undefined;
        currentValue =
          selectedText && !isSelectPlaceholderText(selectedText)
            ? selectedText
            : undefined;
      } else if (type === "time") {
        const inp = element.querySelector<HTMLInputElement>(
          ".ant-picker-input input",
        );
        currentValue = inp?.value?.trim() || undefined;
      } else if (type === "date" || type === "daterange") {
        const dateInputs = element.querySelectorAll<HTMLInputElement>("input");
        currentValue =
          Array.from(dateInputs)
            .map((inp) => inp.value)
            .filter(Boolean)
            .join(",") || undefined;
      } else if (type === "cascader") {
        currentValue =
          element
            .querySelector(".ant-cascader-picker-label")
            ?.textContent?.trim() ||
          element
            .querySelector(".ant-select-selection-item")
            ?.textContent?.trim() ||
          element
            .querySelector(".ant-select-selection-selected-value")
            ?.textContent?.trim() ||
          undefined;
      } else if (type === "treeselect") {
        currentValue =
          element
            .querySelector(".ant-select-selection-item")
            ?.textContent?.trim() ||
          element
            .querySelector(".ant-select-selection-selected-value")
            ?.textContent?.trim() ||
          undefined;
      } else if (type === "switch") {
        const sw = element.classList.contains("ant-switch")
          ? element
          : element.querySelector(".ant-switch");
        currentValue = sw?.classList.contains("ant-switch-checked")
          ? "true"
          : "false";
      } else if (type === "transfer") {
        const rightItems = element.querySelectorAll(
          ".ant-transfer-list:last-child .ant-transfer-list-content-item",
        );
        currentValue =
          rightItems.length > 0 ? `${rightItems.length} 项已选` : undefined;
      } else if (type === "radio") {
        // 已选中的 radio：提取文本作为 currentValue，避免多轮填充时被重新点选导致依赖字段被清空
        const checked = element.querySelector<HTMLElement>(
          ".ant-radio-wrapper-checked",
        );
        if (checked) {
          const span = checked.querySelector(":scope > span:not(.ant-radio)");
          currentValue =
            (span?.textContent ?? checked.textContent ?? "").trim() ||
            undefined;
        }
      } else if (type === "checkbox") {
        if (element.classList.contains("ant-checkbox-group")) {
          const checkedWrappers = Array.from(
            element.querySelectorAll<HTMLElement>(
              ".ant-checkbox-wrapper-checked",
            ),
          );
          if (checkedWrappers.length > 0) {
            const labels = checkedWrappers
              .map((el) => {
                const span = el.querySelector(
                  ":scope > span:not(.ant-checkbox)",
                );
                return (span?.textContent ?? el.textContent ?? "").trim();
              })
              .filter(Boolean);
            currentValue = labels.length > 0 ? labels.join(",") : "true";
          }
        } else if (element.classList.contains("ant-checkbox-wrapper-checked")) {
          const span = element.querySelector(
            ":scope > span:not(.ant-checkbox)",
          );
          currentValue =
            (span?.textContent ?? element.textContent ?? "").trim() || "true";
        }
      }

      fields.push({
        id: `field_${fieldIndex}`,
        label: `${base}${labelSuffix}`,
        type,
        required,
        placeholder,
        ruleHints,
        validationError,
        extra: baseExtra,
        options: options.length > 0 ? options : undefined,
        constraints,
        currentValue,
      });
      fieldIndex++;
    };

    for (let i = 0; i < controls.length; i++) {
      const suffix = i === 0 ? "" : `（${i + 1}）`;
      pushField(controls[i].type, controls[i].element, suffix);
    }
  }

  console.log(
    `[AI Form Copilot] 识别到 ${fields.length} 个可填充字段:`,
    fields.map((f) => `${f.label}(${f.type})`).join(", "),
  );

  return fields;
}
