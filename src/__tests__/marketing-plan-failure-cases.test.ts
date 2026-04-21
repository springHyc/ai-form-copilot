/**
 * 回归单测：营销计划第一步等页面曾出现的失败案例。
 * 对应业务参考 jarvis …/createMarketPlan/FirstStep.tsx（DOM 为 antd 类名近似还原）。
 *
 * 与一键填充筛选逻辑保持一致：src/popup/App.tsx — hasFieldValue / hasValidationError
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scanFormFields } from "@/content/scanner";
import { generateMockData } from "@/utils/mock-rules";
import { parseIsoDateParts, parseTimeParts } from "@/content/antd-adapter";
import type { FormFieldInfo } from "@/shared/types";

/** 与 Popup 一键填充「本轮是否需要生成/填充」一致 */
function hasFieldValue(field: FormFieldInfo): boolean {
  if (field.currentValue === undefined || field.currentValue === null)
    return false;
  return field.currentValue.trim().length > 0;
}

function hasValidationError(field: FormFieldInfo): boolean {
  return Boolean(field.validationError?.trim());
}

function fieldNeedsFillInOneClickPass(field: FormFieldInfo): boolean {
  return !hasFieldValue(field) || hasValidationError(field);
}

describe("一键填充字段筛选（与 Popup 逻辑对齐）", () => {
  it("有 validationError 时即使已有 currentValue 仍纳入下一轮", () => {
    const field: FormFieldInfo = {
      id: "f1",
      label: "客群标签",
      type: "input",
      currentValue: "中文",
      validationError: "客群标签不超过10个字符仅支持数字英文",
    };
    expect(fieldNeedsFillInOneClickPass(field)).toBe(true);
  });
});

function mountVisibleForm(html: string) {
  document.body.innerHTML = `<div id="fixture-root">${html}</div>`;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  // scanner 用 offsetWidth/高度判断可见；jsdom 默认为 0
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 320,
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 40,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
});

describe("失败案例 1：选择名单包（异步 Select）", () => {
  it("扫描为 select，无选中项时 options 为空（由 fillSelect 在页面上等待选项）", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>选择名单包</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single">
              <div class="ant-select-selector">
                <span class="ant-select-selection-search">
                  <input type="search" class="ant-select-selection-search-input" placeholder="请选择选择名单包" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe("select");
    expect(fields[0].label).toContain("选择名单包");
    expect(fields[0].options).toBeUndefined();
  });
});

describe("失败案例 2：进入计划的名单数量（Radio + 同项内 ProFormDigit）", () => {
  it("同一 .ant-form-item 内应识别 radio 与嵌套 number 两个字段", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>进入计划的名单数量</label></div>
          <div class="ant-form-item-control">
            <div class="ant-radio-group">
              <label class="ant-radio-wrapper">
                <span class="ant-radio"><input type="radio" /></span>
                <span>从名单包中按比例选取进入计划，比例为</span>
              </label>
            </div>
            <div class="ant-input-number">
              <div class="ant-input-number-input-wrap">
                <input class="ant-input-number-input" type="text" min="1" max="100" value="" placeholder="比例" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields.map((f) => `${f.label}:${f.type}`)).toEqual([
      "进入计划的名单数量:radio",
      "进入计划的名单数量（数值）:number",
    ]);
    const data = generateMockData(fields);
    expect(data[fields[1].id]).toMatch(/^\d+(\.\d+)?$/);
  });
});

describe("失败案例 3：执行频次（Radio）", () => {
  it("应提取选项文案", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>执行频次</label></div>
          <div class="ant-form-item-control">
            <div class="ant-radio-group">
              <label class="ant-radio-wrapper">
                <span class="ant-radio"><input type="radio" /></span>
                <span>每天</span>
              </label>
              <label class="ant-radio-wrapper">
                <span class="ant-radio"><input type="radio" /></span>
                <span>每周</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("radio");
    expect(fields[0].options?.sort()).toEqual(["每天", "每周"].sort());
  });

  it("已选中项应写入 currentValue，避免多轮一键填充反复改选导致依赖项被清空", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>执行频次</label></div>
          <div class="ant-form-item-control">
            <div class="ant-radio-group">
              <label class="ant-radio-wrapper ant-radio-wrapper-checked">
                <span class="ant-radio ant-radio-checked"><input type="radio" checked /></span>
                <span>每周</span>
              </label>
              <label class="ant-radio-wrapper">
                <span class="ant-radio"><input type="radio" /></span>
                <span>每月</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].currentValue).toBe("每周");
    expect(fieldNeedsFillInOneClickPass(fields[0])).toBe(false);
  });
});

describe("失败案例 4：执行时间（ProFormDateTimePicker → date + 带时分秒字符串）", () => {
  it("扫描为 date 类型", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>执行时间</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker">
              <input readonly class="ant-picker-input" value="" />
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("date");
    expect(fields[0].label).toContain("执行时间");
  });

  it("Mock 对「执行时间」类 label 生成 YYYY-MM-DD HH:mm:ss", () => {
    const field: FormFieldInfo = {
      id: "field_exec",
      label: "执行时间",
      type: "date",
      required: true,
    };
    const data = generateMockData([field]);
    const v = data[field.id]!;
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(parseIsoDateParts(v)).toEqual({
      y: Number(v.slice(0, 4)),
      m: Number(v.slice(5, 7)),
      d: Number(v.slice(8, 10)),
    });
    expect(parseTimeParts(v)).not.toBeNull();
  });
});

describe("失败案例 6：渠道代码（企业金融）（input，须字母数字勿误为公司名）", () => {
  it("无 ruleHints 时仅凭 label 也应走编码类 Mock，不得生成中文公司名", () => {
    const field: FormFieldInfo = {
      id: "field_channel",
      label: "渠道代码（企业金融）",
      type: "input",
      required: true,
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v.length).toBeGreaterThan(0);
    expect(v).toMatch(/^[A-Z0-9]+$/);
    expect(/[\u4e00-\u9fff]/.test(v)).toBe(false);
  });

  it("扫描到 .ant-form-item-explain-error 时应带出 validationError", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>渠道代码（企业金融）</label></div>
          <div class="ant-form-item-control">
            <input class="ant-input" type="text" value="金源服务集团" />
          </div>
        </div>
        <div class="ant-form-item-explain-error">请输入字母或数字</div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toContain("渠道代码");
    expect(fields[0].type).toBe("input");
    expect(fields[0].currentValue).toContain("金源");
    expect(fields[0].validationError).toBe("请输入字母或数字");
    expect(fieldNeedsFillInOneClickPass(fields[0])).toBe(true);
  });

  it("ruleHints 含「字母或数字」时 generateMockData 仅生成字母数字", () => {
    const field: FormFieldInfo = {
      id: "field_ch2",
      label: "渠道代码（企业金融）",
      type: "input",
      required: true,
      ruleHints: "请输入字母或数字",
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^[A-Z0-9]+$/);
    expect(/[\u4e00-\u9fff]/.test(v)).toBe(false);
  });

  it("仅有 ant-form-item-has-error 无 explain-error 类时扫描兜底校验文案", () => {
    mountVisibleForm(`
      <div class="ant-form-item ant-form-item-has-error">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>渠道代码（企业金融）</label></div>
          <div class="ant-form-item-control">
            <input class="ant-input" type="text" value="bad" />
          </div>
        </div>
        <div class="ant-form-item-explain-connected">请输入字母或数字</div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].validationError).toBe("请输入字母或数字");
  });
});

describe("失败案例 5：客群标签（rule 提示仅数字英文 + 长度）", () => {
  it("扫描应合并 tooltip 到 ruleHints，并推断 maxLength", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label">
            <label>客群标签</label>
            <span class="anticon anticon-question-circle" title="客群标签不超过10个字符仅支持数字英文"></span>
          </div>
          <div class="ant-form-item-control">
            <input class="ant-input" type="text" placeholder="请输入计划标签" />
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("input");
    expect(fields[0].ruleHints).toMatch(/不超过10个字符/);
    expect(fields[0].ruleHints).toMatch(/数字英文|英文数字|支持/);
    expect(fields[0].constraints?.maxLength).toBe(10);
  });

  it("generateMockData 应生成字母数字串且不超过 maxLength", () => {
    const field: FormFieldInfo = {
      id: "field_tag",
      label: "客群标签",
      type: "input",
      required: true,
      placeholder: "请输入计划标签",
      ruleHints: "客群标签不超过10个字符仅支持数字英文",
      constraints: { maxLength: 10 },
    };
    const data = generateMockData([field]);
    const v = data[field.id]!;
    expect(v).toMatch(/^[A-Z0-9]+$/);
    expect(v.length).toBeLessThanOrEqual(10);
  });
});

describe("扫描：嵌套 .ant-form-item 不重复计数（防 field_N 错位）", () => {
  it("仅顶层表单项进入扫描结果", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>外层</label></div>
          <div class="ant-form-item-control">
            <div class="ant-form-item">
              <div class="ant-form-item-label"><label>内层嵌套</label></div>
              <div class="ant-form-item-control">
                <input class="ant-input" value="nested" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields.map((f) => f.label)).toEqual(["外层"]);
  });
});
