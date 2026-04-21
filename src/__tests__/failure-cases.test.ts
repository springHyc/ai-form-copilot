/**
 * 失败案例回归合集：覆盖 scan / mock / fill / popup 四侧曾经漏过的场景。
 * 按「失败案例 N」顺序追加（模板见 .cursor/skills/ai-form-failure-case/SKILL.md），DOM 用 antd 类名在 jsdom 里近似还原。
 * 典型参考页：jarvis 营销计划 FirstStep.tsx、scenesf antd 4.x Select、new-apple 新增处理人抽屉、new-market 首页弹窗 RangePicker 等。
 * 与一键填充筛选逻辑保持一致：src/popup/App.tsx — hasFieldValue / hasValidationError
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scanFormFields } from "@/content/scanner";
import { generateMockData } from "@/utils/mock-rules";
import {
  fillFormFields,
  parseIsoDateParts,
  parseTimeParts,
} from "@/content/antd-adapter";
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
      required: true,
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

  it("generateMockData：无 options 的 select（如异步「资金方」）须生成 random，否则一键填充会跳过", () => {
    const field: FormFieldInfo = {
      id: "field_0",
      label: "资金方",
      type: "select",
      required: true,
    };
    const data = generateMockData([field]);
    expect(data.field_0).toBe("random");
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
      "进入计划的名单数量（2）:number",
    ]);
    const data = generateMockData(fields);
    expect(data[fields[1].id]).toMatch(/^\d+(\.\d+)?$/);
  });

  it("ProFormDigit 作为 Radio.Group 内部条件渲染子节点时也应被枚举（jarvis 解除隔离规则）", () => {
    // 对齐 @jarvis/src/pages/marketPlanManage/createMarketPlan/FirstStep.tsx:569-668 的真实 DOM：
    // Radio.Group 渲染成 .ant-radio-group，条件 ProFormDependency 产出的 ProFormDigit 落在 group 内部
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>解除隔离规则</label></div>
          <div class="ant-form-item-control">
            <div class="ant-radio-group">
              <div>
                <label class="ant-radio-wrapper ant-radio-wrapper-checked">
                  <span class="ant-radio"><input type="radio" /></span>
                  <span>满足任一条件解除隔离:</span>
                </label>
                <span>1 达成目标计划; 2 计划终止后</span>
                <div class="ant-input-number">
                  <input class="ant-input-number-input" type="text" min="1" value="" placeholder="请输入" />
                </div>
                <span>天； 3 计划最后一频次结束后</span>
                <div class="ant-input-number">
                  <input class="ant-input-number-input" type="text" min="1" value="" placeholder="请输入" />
                </div>
                <span>天</span>
              </div>
              <div>
                <label class="ant-radio-wrapper">
                  <span class="ant-radio"><input type="radio" /></span>
                  <span>从用户进入计划开始，统一在</span>
                </label>
              </div>
              <div>
                <label class="ant-radio-wrapper">
                  <span class="ant-radio"><input type="radio" /></span>
                  <span>统一在</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields.map((f) => `${f.label}:${f.type}`)).toEqual([
      "解除隔离规则:radio",
      "解除隔离规则（2）:number",
      "解除隔离规则（3）:number",
    ]);
    expect(fields[0].currentValue).toContain("满足任一条件");
    expect(fields[1].currentValue).toBeUndefined();
    expect(fields[2].currentValue).toBeUndefined();
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
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(parseIsoDateParts(v)).toEqual({
      y: Number(v.slice(0, 4)),
      m: Number(v.slice(5, 7)),
      d: Number(v.slice(8, 10)),
    });
    expect(parseTimeParts(v)).not.toBeNull();
    // 对齐 antd@4 常见 disabledTime 仅放开整点/半点（如 scenesf 短信执行时间）
    expect(["00", "30"]).toContain(v.slice(14, 16));
  });

  it("Mock：无 extra 时「执行时间」至少为本地次日（对齐常见 disabledDate：昨天及以前不可选）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0));
    const field: FormFieldInfo = {
      id: "field_exec",
      label: "执行时间",
      type: "date",
      required: true,
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    const parts = parseIsoDateParts(v)!;
    const tMin = new Date(2026, 3, 21);
    const got = parts.y * 10000 + parts.m * 100 + parts.d;
    const min = tMin.getFullYear() * 10000 + (tMin.getMonth() + 1) * 100 + tMin.getDate();
    expect(got).toBeGreaterThanOrEqual(min);
    vi.useRealTimers();
  });

  it("Mock：extra 含名单包等提示时日偏移下限抬高（计划执行时间需晚于名单包）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0));
    const field: FormFieldInfo = {
      id: "field_exec",
      label: "执行时间",
      type: "date",
      required: true,
      extra:
        "注：重复析出型名单包，计划执行时间需晚于名单包执行时间；单次型名单包，名单包已完成析出则不再校验名单包执行时间",
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    const parts = parseIsoDateParts(v)!;
    const tMin = new Date(2026, 3, 22);
    const got = parts.y * 10000 + parts.m * 100 + parts.d;
    const min = tMin.getFullYear() * 10000 + (tMin.getMonth() + 1) * 100 + tMin.getDate();
    expect(got).toBeGreaterThanOrEqual(min);
    vi.useRealTimers();
  });

  it("Mock：date + extra 暗示不可选过去时走未来日期时间（非「执行时间」标签也可命中）", () => {
    const field: FormFieldInfo = {
      id: "f",
      label: "自定义时间",
      type: "date",
      required: true,
      extra: "需晚于名单包执行时间",
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("失败案例 5：执行时间（jarvis 同项 Select + ProFormTimePicker）", () => {
  it("扫描为 select + time 两个字段（不因 .ant-select 优先而漏掉 TimePicker）", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label title="执行时间">执行时间</label></div>
          <div class="ant-form-item-control">
            <div class="ant-form-item-control-input-content">
              <div class="ant-select ant-select-single">
                <div class="ant-select-selector">
                  <span class="ant-select-selection-item" title="每天">每天</span>
                </div>
              </div>
              <span style="padding:0 4px"> </span>
              <div class="ant-picker">
                <div class="ant-picker-input">
                  <input id="first_period_execTime" readonly placeholder="请选择时间" value="" />
                </div>
                <span class="ant-picker-suffix">
                  <span role="img" aria-label="clock-circle" class="anticon anticon-clock-circle"></span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields.length).toBe(2);
    expect(fields[0].type).toBe("select");
    expect(fields[1].type).toBe("time");
    expect(fields[1].label).toBe("执行时间（2）");
  });

  it("Mock 对 type=time 生成 HH:mm:ss", () => {
    const field: FormFieldInfo = {
      id: "field_t",
      label: "执行时间（2）",
      type: "time",
      required: true,
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^\d{2}:\d{2}:\d{2}$/);
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

describe("失败案例 7：产品类型（antd 4 Select，须能点开并点选 menu-item）", () => {
  it("扫描：Select 当前为「请选择...」时，currentValue / options 均应视为未填（避免一键填充跳过）", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>用户类型</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single ant-select-enabled">
              <div class="ant-select-selection ant-select-selection--single">
                <div class="ant-select-selection__rendered">
                  <div class="ant-select-selection-selected-value" title="请选择用户类型">请选择用户类型</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("select");
    expect(fields[0].currentValue).toBeUndefined();
    expect(fields[0].options).toBeUndefined();
    expect(fieldNeedsFillInOneClickPass(fields[0])).toBe(true);
  });

  it("fillSelect：antd 4 使用 .ant-select-selection + .ant-select-dropdown-menu-item", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>产品类型</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single ant-select-enabled">
              <div class="ant-select-selection ant-select-selection--single" tabindex="0">
                <div class="ant-select-selection__rendered">
                  <div class="ant-select-selection-placeholder">请选择</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const dd = document.createElement("div");
    dd.className = "ant-select-dropdown";
    dd.innerHTML = `
      <div>
        <ul role="listbox" class="ant-select-dropdown-menu">
          <li role="option" class="ant-select-dropdown-menu-item">消费贷</li>
          <li role="option" class="ant-select-dropdown-menu-item">经营贷</li>
        </ul>
      </div>
    `;
    document.body.appendChild(dd);

    const filled = await fillFormFields([], { field_0: "random" });
    expect(filled).toBe(1);
  });

  it("fillSelect：随机选择应跳过「请选择...」占位项（new-market 用户类型/运营商/通道）", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>用户类型</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single ant-select-enabled">
              <div class="ant-select-selection ant-select-selection--single" tabindex="0">
                <div class="ant-select-selection__rendered">
                  <div class="ant-select-selection-selected-value" title="请选择用户类型">请选择用户类型</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const dd = document.createElement("div");
    dd.className = "ant-select-dropdown";
    dd.innerHTML = `
      <div>
        <ul role="listbox" class="ant-select-dropdown-menu">
          <li role="option" class="ant-select-dropdown-menu-item">请选择用户类型</li>
          <li role="option" class="ant-select-dropdown-menu-item">未激活用户</li>
          <li role="option" class="ant-select-dropdown-menu-item">待还款用户</li>
        </ul>
      </div>
    `;
    document.body.appendChild(dd);

    const selected = document.querySelector<HTMLElement>(".ant-select-selection-selected-value")!;
    dd.querySelectorAll<HTMLElement>(".ant-select-dropdown-menu-item").forEach((opt) => {
      opt.addEventListener("click", () => {
        selected.textContent = opt.textContent ?? "";
      });
    });

    const filled = await fillFormFields([], { field_0: "random" });
    expect(filled).toBe(1);
    expect(selected.textContent?.trim()).not.toBe("请选择用户类型");
    expect(["未激活用户", "待还款用户"]).toContain(selected.textContent?.trim());
  });

  it("fillSelect：antd 5+ 使用 .ant-select-selector + .ant-select-item-option（点 option-content）", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>产品类型</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single ant-select-outlined ant-select-enabled">
              <div class="ant-select-selector" tabindex="0">
                <div class="ant-select-selection-wrap">
                  <div class="ant-select-selection-placeholder">请选择</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const dd = document.createElement("div");
    dd.className = "ant-select-dropdown";
    dd.innerHTML = `
      <div class="rc-virtual-list">
        <div class="ant-select-item ant-select-item-option" title="类型甲">
          <div class="ant-select-item-option-content">类型甲</div>
        </div>
        <div class="ant-select-item ant-select-item-option" title="类型乙">
          <div class="ant-select-item-option-content">类型乙</div>
        </div>
      </div>
    `;
    document.body.appendChild(dd);

    const filled = await fillFormFields([], { field_0: "nomatch" });
    expect(filled).toBe(1);
  });

  it("扫描 antd 4 已选 Select 时 currentValue 取自 .ant-select-selection-selected-value", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>产品类型</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-single ant-select-enabled">
              <div class="ant-select-selection ant-select-selection--single">
                <div class="ant-select-selection__rendered">
                  <div class="ant-select-selection-selected-value" title="经营贷">经营贷</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("select");
    expect(fields[0].label).toContain("产品类型");
    expect(fields[0].currentValue).toBe("经营贷");
    expect(fieldNeedsFillInOneClickPass(fields[0])).toBe(false);
  });
});

/**
 * 截图：AI Form Copilot「新增处理人」— 源码见 new-apple/src/pages/sys/business-config/repayment-handler/drawer.tsx。
 * 资金方无 options 时 Mock 须 random；手机号表单项为 Input disabled，与业务一致，填充阶段应跳过。
 */
describe("截图回归：新增处理人（资金方 + 处理人姓名 + 处理人手机号）", () => {
  const addHandlerFormHtml = `
    <div class="ant-form-item">
      <div class="ant-row">
        <div class="ant-form-item-label"><label class="ant-form-item-required">资金方</label></div>
        <div class="ant-form-item-control">
          <div class="ant-select ant-select-single ant-select-enabled">
            <div class="ant-select-selection ant-select-selection--single" tabindex="0">
              <div class="ant-select-selection__rendered">
                <div class="ant-select-selection-placeholder">请选择</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ant-form-item">
      <div class="ant-row">
        <div class="ant-form-item-label"><label class="ant-form-item-required">处理人姓名</label></div>
        <div class="ant-form-item-control">
          <div class="ant-select ant-select-single ant-select-enabled">
            <div class="ant-select-selection ant-select-selection--single" tabindex="0">
              <div class="ant-select-selection__rendered">
                <div class="ant-select-selection-placeholder">请选择</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ant-form-item">
      <div class="ant-row">
        <div class="ant-form-item-label"><label>处理人手机号</label></div>
        <div class="ant-form-item-control">
          <input class="ant-input" type="text" placeholder="选择处理人姓名后自动带出" disabled value="" />
        </div>
      </div>
    </div>
  `;

  it("扫描顺序与类型：两路异步 Select + 联动号码（Input disabled，与 drawer 一致）", () => {
    mountVisibleForm(addHandlerFormHtml);
    const fields = scanFormFields();
    expect(fields).toHaveLength(3);
    expect(fields.map((f) => [f.label, f.type] as const)).toEqual([
      ["资金方", "select"],
      ["处理人姓名", "select"],
      ["处理人手机号", "input"],
    ]);
    expect(fields[0].options).toBeUndefined();
    expect(fields[1].options).toBeUndefined();
    expect([fields[0].required, fields[1].required, fields[2].required]).toEqual([
      true,
      true,
      false,
    ]);
    expect(fields[2].placeholder).toContain("自动带出");
    const mobileInput = document.querySelector<HTMLInputElement>(
      ".ant-form-item:last-of-type .ant-input",
    );
    expect(mobileInput?.disabled).toBe(true);
  });

  it("generateMockData：field_0 random、field_1 中文名；field_2 仍按标签生成手机号（联动字段不依赖该值写入 DOM）", () => {
    mountVisibleForm(addHandlerFormHtml);
    const fields = scanFormFields();
    const data = generateMockData(fields);
    expect(data.field_0).toBe("random");
    expect(String(data.field_1)).toMatch(/[\u4e00-\u9fff]/);
    expect(String(data.field_2)).toMatch(/^1[3-9]\d{9}$/);
    expect(Object.keys(data).sort()).toEqual(["field_0", "field_1", "field_2"]);
  });

  it("处理人手机号 disabled：fillInput 跳过，不计入 filledCount（真实联动由 React onChange 带出）", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>处理人手机号</label></div>
          <div class="ant-form-item-control">
            <input class="ant-input" disabled placeholder="选择处理人姓名后自动带出" value="" />
          </div>
        </div>
      </div>
    `);
    const filled = await fillFormFields([], { field_0: "13800138000" });
    expect(filled).toBe(0);
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
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^[A-Z0-9]+$/);
    expect(v.length).toBeLessThanOrEqual(10);
  });
});

describe("失败案例 8：参数拼接类（textarea，pattern 或「只能包含…」枚举）", () => {
  it("constraints.pattern 为 ^[...]+$ 时 Mock 仅从字符类取样（不依赖 label）", () => {
    const field: FormFieldInfo = {
      id: "field_params",
      label: "任意业务标签",
      type: "textarea",
      required: true,
      constraints: { maxLength: 100, pattern: "^[a-zA-Z0-9&=]+$" },
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^[a-zA-Z0-9&=]+$/);
    expect(v.length).toBeLessThanOrEqual(100);
  });

  it("无 pattern 时从校验/规则中文「只能包含字母、数字、&、=」解析字符集", () => {
    const field: FormFieldInfo = {
      id: "field_params",
      label: "自定义字段",
      type: "textarea",
      required: true,
      validationError: "参数拼接只能包含字母、数字、& 、=",
      constraints: { maxLength: 100 },
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^[a-zA-Z0-9&=]+$/);
    expect(v.length).toBeLessThanOrEqual(100);
  });

  it("pattern 为无 ^$ 的纯字符类（如 RegExp.source）时仍可解析", () => {
    const field: FormFieldInfo = {
      id: "field_p",
      label: "x",
      type: "textarea",
      required: true,
      constraints: { maxLength: 50, pattern: "[a-zA-Z0-9&=]+" },
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(/^[a-zA-Z0-9&=]+$/);
  });
});

describe("扫描：antd explain-connected + role=alert + 内层 explain-error（短链 params 等）", () => {
  it("flex 包裹下仍能读到 .ant-form-item-explain-error 文案", () => {
    mountVisibleForm(`
      <div class="ant-form-item ant-form-item-has-error">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>参数拼接</label></div>
          <div class="ant-form-item-control">
            <textarea class="ant-input" aria-invalid="true" aria-describedby="params_help"></textarea>
          </div>
          <div style="display: flex; flex-wrap: nowrap;">
            <div id="params_help" class="ant-form-item-explain ant-form-item-explain-connected" role="alert">
              <div class="ant-form-item-explain-error">参数拼接只能包含字母、数字、&amp; 、=</div>
            </div>
            <div style="width: 0px; height: 24px;"></div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].validationError).toContain("只能包含");
    expect(fields[0].validationError).toContain("字母");
  });

  it("explain 区域仅在 document.getElementById(aria-describedby) 可命中时仍能解析", () => {
    document.body.innerHTML = `
      <div id="fixture-root">
        <div class="ant-form-item ant-form-item-has-error">
          <div class="ant-form-item-label"><label>参数拼接</label></div>
          <div class="ant-form-item-control">
            <textarea class="ant-input" aria-invalid="true" aria-describedby="params_help"></textarea>
          </div>
        </div>
        <div style="display:flex">
          <div id="params_help" class="ant-form-item-explain ant-form-item-explain-connected" role="alert">
            <div class="ant-form-item-explain-error">参数拼接只能包含字母、数字、& 、=</div>
          </div>
        </div>
      </div>
    `;
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 320 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 40 });
    const fields = scanFormFields();
    expect(fields.length).toBeGreaterThanOrEqual(1);
    const f = fields.find((x) => x.label.includes("参数")) ?? fields[0];
    expect(f.validationError).toContain("只能包含");
    document.body.innerHTML = "";
    delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });
});

describe("扫描：antd 4 风格校验文案（仅有 .ant-form-item-explain）", () => {
  it("has-error 且无 explain-error 子类时仍能读出 validationError（多轮纠偏依赖此项）", () => {
    mountVisibleForm(`
      <div class="ant-form-item ant-form-item-has-error">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>参数拼接</label></div>
          <div class="ant-form-item-control">
            <textarea class="ant-input">bad</textarea>
          </div>
          <div class="ant-form-item-explain">
            <div>参数拼接只能包含字母、数字、& 、=</div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].validationError).toContain("只能包含");
    expect(fields[0].validationError).toContain("字母");
  });
});

describe("扫描：data-ai-pattern（rules 不落 DOM 时的通用挂载点）", () => {
  it("从 .ant-form-item 读取 data-ai-pattern 并入 constraints.pattern", () => {
    mountVisibleForm(`
      <div class="ant-form-item" data-ai-pattern="^[a-zA-Z0-9&=]+$">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>自定义</label></div>
          <div class="ant-form-item-control">
            <textarea class="ant-input" maxlength="100"></textarea>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].constraints?.pattern).toBe("^[a-zA-Z0-9&=]+$");
  });
});

describe("扫描：textarea 的 HTML pattern", () => {
  it("写入 constraints.pattern（与 Mock 通用字符集逻辑配套）", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>query</label></div>
          <div class="ant-form-item-control">
            <textarea class="ant-input" maxlength="100" pattern="^[a-zA-Z0-9&=]+$"></textarea>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields[0].type).toBe("textarea");
    expect(fields[0].constraints?.pattern).toBe("^[a-zA-Z0-9&=]+$");
    expect(fields[0].constraints?.maxLength).toBe(100);
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

/**
 * 失败案例 9：new-market 榕树运营管理系统首页弹窗「有效时间」
 * 业务代码：new-market/src/pages/rongshu/common-manage/home-popup/add-info.tsx:360-362
 *   <RangePicker showTime={{ format: 'HH:mm:ss' }} format='YYYY-MM-DD HH:mm:ss' placeholder={['开始时间', '结束时间']} />
 * 旧实现：fillDateRange 直写路径把值截成 YYYY-MM-DD，丢掉 HH:mm:ss —— 页面仍提示「请选择有效时间」。
 * 修复：Mock 固定给出 HH:mm:ss 的双端，fillDateRange 保留整串；placeholder 暗示 showTime 时不回退纯日期。
 */
describe("失败案例 9：RangePicker + showTime（new-market 首页弹窗「有效时间」）", () => {
  it("扫描为 daterange，placeholder 带「开始时间/结束时间」进入 ruleHints", () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>有效时间</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker ant-picker-range">
              <div class="ant-picker-input"><input placeholder="开始时间" value="" /></div>
              <div class="ant-picker-range-separator">~</div>
              <div class="ant-picker-input"><input placeholder="结束时间" value="" /></div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe("daterange");
    expect(fields[0].label).toContain("有效时间");
  });

  it("Mock 对 daterange 生成 `YYYY-MM-DD HH:mm:ss,YYYY-MM-DD HH:mm:ss`（分钟仅 00/30）", () => {
    const field: FormFieldInfo = {
      id: "field_range",
      label: "有效时间",
      type: "daterange",
      required: true,
    };
    const data = generateMockData([field]);
    const v = String(data[field.id] ?? "");
    expect(v).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:(00|30):\d{2},\d{4}-\d{2}-\d{2} \d{2}:(00|30):\d{2}$/,
    );
    const [a, b] = v.split(",");
    expect(parseIsoDateParts(a)).not.toBeNull();
    expect(parseIsoDateParts(b)).not.toBeNull();
    expect(parseTimeParts(a)).not.toBeNull();
    expect(parseTimeParts(b)).not.toBeNull();
    expect(new Date(a.replace(" ", "T")) < new Date(b.replace(" ", "T"))).toBe(true);
  });

  it("fillFormFields：showTime RangePicker 直写保留时分秒（home-popup `format='YYYY-MM-DD HH:mm:ss'` → input size=21）", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>有效时间</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker ant-picker-range">
              <div class="ant-picker-input"><input size="21" placeholder="开始时间" value="" /></div>
              <div class="ant-picker-range-separator">~</div>
              <div class="ant-picker-input"><input size="21" placeholder="结束时间" value="" /></div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    const data = { [fields[0].id]: "2026-05-01 10:00:00,2026-05-02 17:30:00" };
    await fillFormFields(fields, data);
    const inputs = document.querySelectorAll<HTMLInputElement>(".ant-picker-input input");
    expect(inputs[0].value).toBe("2026-05-01 10:00:00");
    expect(inputs[1].value).toBe("2026-05-02 17:30:00");
  });

  it("fillFormFields：纯日期 RangePicker 但 placeholder 沿用「开始/结束时间」(buoy-deploy `format='YYYY-MM-DD'` → size=12) 直写应回退为纯日期", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>有效时间</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker ant-picker-range">
              <div class="ant-picker-input"><input size="12" placeholder="开始时间" value="" /></div>
              <div class="ant-picker-range-separator">~</div>
              <div class="ant-picker-input"><input size="12" placeholder="结束时间" value="" /></div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    const data = { [fields[0].id]: "2026-05-01 10:00:00,2026-05-02 17:30:00" };
    await fillFormFields(fields, data);
    const inputs = document.querySelectorAll<HTMLInputElement>(".ant-picker-input input");
    expect(inputs[0].value).toBe("2026-05-01");
    expect(inputs[1].value).toBe("2026-05-02");
  });

  it("fillFormFields：普通 RangePicker（placeholder「开始日期/结束日期」）直写回退为纯日期", async () => {
    mountVisibleForm(`
      <div class="ant-form-item">
        <div class="ant-row">
          <div class="ant-form-item-label"><label>起止日期</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker ant-picker-range">
              <div class="ant-picker-input"><input size="12" placeholder="开始日期" value="" /></div>
              <div class="ant-picker-range-separator">~</div>
              <div class="ant-picker-input"><input size="12" placeholder="结束日期" value="" /></div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = scanFormFields();
    const data = { [fields[0].id]: "2026-05-01 10:00:00,2026-05-02 17:30:00" };
    await fillFormFields(fields, data);
    const inputs = document.querySelectorAll<HTMLInputElement>(".ant-picker-input input");
    expect(inputs[0].value).toBe("2026-05-01");
    expect(inputs[1].value).toBe("2026-05-02");
  });
});
