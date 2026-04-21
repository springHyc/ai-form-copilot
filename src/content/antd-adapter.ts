import type { FieldType, FillData, FormFieldInfo } from '@/shared/types';

/**
 * 触发 React 受控组件的值变更。
 * React 劫持了 input.value 的 setter，直接赋值不触发 onChange，
 * 需要通过原生 setter 设置值，再手动派发事件。
 */
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value',
  )?.set;

  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function simulateClick(element: HTMLElement) {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * 尽量贴近真实指针：rc-select / React 常监听 mousedown；末尾再调原生 click 提高受控 Select 的命中率。
 * 不传 view：jsdom / 多 frame 下 globalThis.window 与节点 ownerDocument.defaultView 不一致会抛错。
 */
function simulatePointerClick(element: HTMLElement) {
  const evInit: MouseEventInit = { bubbles: true, cancelable: true };
  const ptrInit: PointerEventInit = {
    ...evInit,
    pointerId: 1,
    pointerType: 'mouse',
  };
  try {
    element.dispatchEvent(new PointerEvent('pointerdown', ptrInit));
  } catch {
    /* jsdom 等环境可能无 PointerEvent */
  }
  element.dispatchEvent(new MouseEvent('mousedown', evInit));
  try {
    element.dispatchEvent(new PointerEvent('pointerup', ptrInit));
  } catch {
    /* ignore */
  }
  element.dispatchEvent(new MouseEvent('mouseup', evInit));
  element.dispatchEvent(new MouseEvent('click', evInit));
  if (typeof element.click === 'function') element.click();
}

async function fillInput(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'input.ant-input, textarea.ant-input, .ant-input-affix-wrapper input',
  );
  if (!input || input.disabled || input.readOnly) return false;
  input.focus();
  setNativeValue(input, value);
  input.blur();
  return true;
}

/** 将任意字符串规范为 InputNumber 可接受的数字字符串（仅数字与小数点） */
function normalizeNumericInputString(raw: string): string {
  const t = String(raw).trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  const n = parseFloat(t.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return '0';
  return String(n);
}

async function fillNumber(container: HTMLElement, value: string) {
  const input = container.querySelector<HTMLInputElement>('.ant-input-number-input');
  if (!input || input.disabled || input.readOnly) return false;
  const numeric = normalizeNumericInputString(value);
  input.focus();
  setNativeValue(input, numeric);
  input.blur();
  return true;
}

/** antd 5+：.ant-select-selector；antd 4：.ant-select-selection */
function getSelectTriggerEl(selectRoot: HTMLElement): HTMLElement | null {
  return (
    selectRoot.querySelector<HTMLElement>('.ant-select-selector')
    ?? selectRoot.querySelector<HTMLElement>('.ant-select-selection')
  );
}

/** antd 5+：.ant-select-item-option；antd 4：.ant-select-dropdown-menu-item；兜底 [role="option"] */
function querySelectOptionNodes(dropdown: HTMLElement): HTMLElement[] {
  const v5 = dropdown.querySelectorAll<HTMLElement>('.ant-select-item-option');
  if (v5.length > 0) return Array.from(v5);
  const v4 = Array.from(
    dropdown.querySelectorAll<HTMLElement>(
      '.ant-select-dropdown-menu-item:not(.ant-select-dropdown-menu-item-disabled)',
    ),
  ).filter((el) => !el.classList.contains('ant-select-dropdown-menu-item-divider'));
  if (v4.length > 0) return v4;
  const byRole = Array.from(dropdown.querySelectorAll<HTMLElement>('[role="option"]')).filter(
    (el) => el.getAttribute('aria-disabled') !== 'true' && !el.closest('.ant-select-item-option-disabled'),
  );
  return byRole;
}

function querySelectableSelectOptions(dropdown: HTMLElement): HTMLElement[] {
  const v5 = dropdown.querySelectorAll<HTMLElement>(
    '.ant-select-item-option:not(.ant-select-item-option-disabled)',
  );
  if (v5.length > 0) return Array.from(v5);
  const v4 = Array.from(
    dropdown.querySelectorAll<HTMLElement>(
      '.ant-select-dropdown-menu-item:not(.ant-select-dropdown-menu-item-disabled):not(.ant-select-dropdown-menu-item-divider)',
    ),
  );
  if (v4.length > 0) return v4;
  return Array.from(dropdown.querySelectorAll<HTMLElement>('[role="option"]')).filter(
    (el) => el.getAttribute('aria-disabled') !== 'true',
  );
}

/** 下拉层是否处于关闭/隐藏态（不要仅靠 offsetHeight，虚拟列表或 transform 下可能为 0） */
function isSelectDropdownHiddenLayer(el: HTMLElement): boolean {
  if (el.style.display === 'none') return true;
  if (el.classList.contains('ant-select-dropdown-hidden')) return true;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return true;
  // jsdom 下 opacity 可能为 ''，Number('')===0 会误判为隐藏
  if (cs.opacity !== '' && !Number.isNaN(parseFloat(cs.opacity)) && parseFloat(cs.opacity) === 0) return true;
  return false;
}

function collectSelectDropdownRoots(): HTMLElement[] {
  const roots = document.querySelectorAll<HTMLElement>('.ant-select-dropdown, .rc-select-dropdown');
  // 后挂载的往往是当前打开的，倒序优先
  return Array.from(roots).reverse();
}

async function fillSelect(container: HTMLElement, value: string) {
  const selectEl = container.querySelector<HTMLElement>('.ant-select');
  if (!selectEl || selectEl.classList.contains('ant-select-disabled')) return false;

  const openAndPick = async (): Promise<boolean> => {
    const trigger = getSelectTriggerEl(selectEl) ?? selectEl;
    trigger.focus();
    simulatePointerClick(trigger);
    await sleep(280);

    // 异步选项加载：最多等待约 5 秒
    for (let i = 0; i < 25; i++) {
      const dropdowns = collectSelectDropdownRoots();
      for (const dropdown of dropdowns) {
        if (isSelectDropdownHiddenLayer(dropdown)) continue;

        const optionNodes = querySelectOptionNodes(dropdown);
        if (optionNodes.length === 0) continue;

        for (const option of optionNodes) {
          const text = option.textContent?.trim() ?? '';
          if (text === value || text.includes(value) || value.includes(text)) {
            const target =
              option.querySelector<HTMLElement>('.ant-select-item-option-content') ?? option;
            simulatePointerClick(target);
            await sleep(120);
            return true;
          }
        }

        // 没有精确匹配，从可用选项中随机选一个
        const available = querySelectableSelectOptions(dropdown);
        if (available.length > 0) {
          const randomIdx = Math.floor(Math.random() * available.length);
          const picked = available[randomIdx];
          const target =
            picked.querySelector<HTMLElement>('.ant-select-item-option-content') ?? picked;
          simulatePointerClick(target);
          await sleep(120);
          return true;
        }
      }
      await sleep(200);
    }
    return false;
  };

  if (await openAndPick()) return true;

  // 第一次没有等到可选项时，关闭并重开再试一次
  document.body.click();
  await sleep(120);
  if (await openAndPick()) return true;

  document.body.click();
  return false;
}

async function fillRadio(container: HTMLElement, value: string) {
  const group = container.querySelector<HTMLElement>('.ant-radio-group');
  if (!group) return false;

  const radios = group.querySelectorAll<HTMLElement>('.ant-radio-wrapper');

  // 先尝试精确匹配
  for (const radio of radios) {
    // 只取 wrapper 直属文本 span，避免拾取嵌套的 ProFormDependency 内容
    const textSpan = radio.querySelector(':scope > span:not(.ant-radio)');
    const text = (textSpan?.textContent?.trim() ?? radio.textContent?.trim() ?? '');
    if (text === value || text.includes(value) || value.includes(text)) {
      // antd 常把 input 隐藏，直接点击 wrapper 更稳定
      simulateClick(radio);
      return true;
    }
  }

  // 没有精确匹配，从未选中的选项中随机选一个
  const unchecked = group.querySelectorAll<HTMLElement>(
    '.ant-radio-wrapper:not(.ant-radio-wrapper-checked)',
  );
  const candidates = unchecked.length > 0 ? unchecked : radios;
  if (candidates.length > 0) {
    const idx = Math.floor(Math.random() * candidates.length);
    simulateClick(candidates[idx]);
    return true;
  }

  return false;
}

async function fillCheckbox(container: HTMLElement, value: string) {
  const values = typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [String(value)];

  const single = container.querySelector<HTMLElement>(
    '.ant-checkbox-wrapper:not(.ant-checkbox-group .ant-checkbox-wrapper)',
  );
  if (single && !container.querySelector('.ant-checkbox-group')) {
    const input = single.querySelector<HTMLElement>('input[type="checkbox"]');
    const isChecked = single.classList.contains('ant-checkbox-wrapper-checked');
    if (value === 'true' && !isChecked && input) simulateClick(input);
    return true;
  }

  const checkboxes = container.querySelectorAll<HTMLElement>('.ant-checkbox-wrapper');
  for (const checkbox of checkboxes) {
    const text = checkbox.textContent?.trim() ?? '';
    const shouldCheck = values.some((v) => text === v || text.includes(v));
    const isChecked = checkbox.classList.contains('ant-checkbox-wrapper-checked');
    if (shouldCheck && !isChecked) {
      const input = checkbox.querySelector<HTMLElement>('input[type="checkbox"]');
      if (input) simulateClick(input);
    }
  }
  return true;
}

/** 解析 YYYY-MM-DD（可选尾部时间，单测依赖此行为） */
export function parseIsoDateParts(s: string): { y: number; m: number; d: number } | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

/** 解析 HH:mm[:ss]（若不存在则返回 null） */
export function parseTimeParts(s: string): { h: number; m: number; sec: number } | null {
  const m = s.trim().match(/\b(\d{2}):(\d{2})(?::(\d{2}))?\b/);
  if (!m) return null;
  return { h: +m[1], m: +m[2], sec: m[3] ? +m[3] : 0 };
}

/** 拆分日期范围字符串（兼容 AI 使用中文逗号或「至」） */
function splitDateRangeValue(value: string): [string, string] | null {
  const v = value.replace(/，/g, ',').trim();
  const comma = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (comma.length >= 2) return [comma[0], comma[1]];
  const zhi = v.split(/\s*至\s*/);
  if (zhi.length >= 2) return [zhi[0].trim(), zhi[1].trim()];
  return null;
}

/** 当前可见的日期下拉（antd 4+ / rc-picker；兼容仅依赖样式、无 -hidden 类的情况） */
function getVisiblePickerDropdown(): HTMLElement | null {
  const candidates: HTMLElement[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('.ant-picker-dropdown')) {
    if (el.classList.contains('ant-picker-dropdown-hidden')) continue;
    const st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 1 && r.height > 1) candidates.push(el);
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((best, el) => {
    const rb = best.getBoundingClientRect();
    const re = el.getBoundingClientRect();
    return re.width * re.height >= rb.width * rb.height ? el : best;
  });
}

/** 从某个面板头部解析当前展示的年、月（兼容中文「3月」与英文 Jan） */
function parsePanelYearMonth(panel: HTMLElement): { y: number; m: number } | null {
  const yBtn = panel.querySelector('.ant-picker-year-btn');
  const mBtn = panel.querySelector('.ant-picker-month-btn');
  if (!yBtn || !mBtn) return null;
  const yMatch = yBtn.textContent?.match(/(\d{4})/);
  if (!yMatch) return null;
  const y = parseInt(yMatch[1], 10);
  const mt = mBtn.textContent?.trim() ?? '';
  const zhM = mt.match(/^(\d{1,2})\s*月/);
  if (zhM) return { y, m: parseInt(zhM[1], 10) };
  const leadingNum = mt.match(/^(\d{1,2})\b/);
  if (leadingNum) return { y, m: parseInt(leadingNum[1], 10) };
  const en = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const low = mt.toLowerCase();
  for (let i = 0; i < en.length; i++) {
    if (low.startsWith(en[i])) return { y, m: i + 1 };
  }
  return null;
}

function clickDayInPanel(panel: HTMLElement, day: number): boolean {
  const cells = panel.querySelectorAll<HTMLElement>(
    'td.ant-picker-cell.ant-picker-cell-in-view:not(.ant-picker-cell-disabled)',
  );
  for (const td of cells) {
    const inner = td.querySelector('.ant-picker-cell-inner');
    if (inner?.textContent?.trim() === String(day)) {
      simulateClick(td);
      return true;
    }
  }
  return false;
}

function isPickerTimeCellDisabled(el: HTMLElement): boolean {
  if (el.classList.contains('ant-picker-time-panel-cell-disabled')) return true;
  if (el.closest('.ant-picker-time-panel-cell-disabled')) return true;
  if (el.getAttribute('aria-disabled') === 'true') return true;
  return false;
}

/** 与 rc-picker 列内文案对齐（antd@4 常见为 "9" 而非 "09"） */
function normalizePickerTimeCellText(raw: string): string {
  const t = raw.trim();
  const n = parseInt(t, 10);
  if (!Number.isNaN(n) && /^\d+$/.test(t)) return String(n).padStart(2, '0');
  return t;
}

/** DateTimePicker 时间面板：按顺序点击时/分/秒（存在几列就处理几列）；兼容 antd@4 + hideDisabledOptions */
async function tryPickTimeInDropdown(dropdown: HTMLElement, value: string): Promise<boolean> {
  const time = parseTimeParts(value);
  if (!time) return false;

  let columns = dropdown.querySelectorAll<HTMLElement>('.ant-picker-time-panel-column');
  if (columns.length === 0) {
    columns = dropdown.querySelectorAll<HTMLElement>('ul.ant-picker-time-panel-column');
  }
  if (columns.length === 0) return false;

  const candidates = [String(time.h).padStart(2, '0'), String(time.m).padStart(2, '0'), String(time.sec).padStart(2, '0')];
  const limit = Math.min(columns.length, candidates.length);

  for (let i = 0; i < limit; i++) {
    const col = columns[i];
    const allCells = Array.from(
      col.querySelectorAll<HTMLElement>('li.ant-picker-time-panel-cell, .ant-picker-time-panel-cell'),
    );
    const enabled = allCells.filter((el) => !isPickerTimeCellDisabled(el));
    const usable = enabled.length > 0 ? enabled : allCells;
    const want = candidates[i];
    let cell = usable.find((el) => normalizePickerTimeCellText(el.textContent ?? '') === want);
    if (!cell && usable.length > 0) {
      const wantNum = parseInt(want, 10);
      if (!Number.isNaN(wantNum)) {
        cell = usable.reduce<HTMLElement | undefined>((best, el) => {
          const n = parseInt(el.textContent?.trim() ?? '', 10);
          if (Number.isNaN(n)) return best;
          if (!best) return el;
          const bn = parseInt(best.textContent?.trim() ?? '', 10);
          return Math.abs(n - wantNum) < Math.abs(bn - wantNum) ? el : best;
        }, undefined);
      }
    }
    if (!cell && usable.length > 0) {
      const idx = Math.min(Math.floor(usable.length / 2), usable.length - 1);
      cell = usable[idx];
    }
    if (cell) {
      simulatePointerClick(cell);
      await sleep(80);
    }
  }

  return true;
}

function localYmdFromDate(d: Date): { y: number; m: number; d: number } {
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

/**
 * 以「今天」为中心：今天、明天、昨天、后天、前天…（本地日历）
 * 用于在页面 disabledDate 未知时，优先点到第一个非禁选日。
 */
function* localDatesFromToday(maxRadius: number): Generator<{ y: number; m: number; d: number }> {
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  yield localYmdFromDate(noon);
  for (let r = 1; r <= maxRadius; r++) {
    const later = new Date(noon);
    later.setDate(later.getDate() + r);
    yield localYmdFromDate(later);
    const earlier = new Date(noon);
    earlier.setDate(earlier.getDate() - r);
    yield localYmdFromDate(earlier);
  }
}

/** 翻月直到点到目标日，或步数耗尽（仅点未带 ant-picker-cell-disabled 的 in-view 格） */
async function navigateUntilDayClicked(
  getDropdown: () => HTMLElement | null,
  y: number,
  m: number,
  d: number,
): Promise<boolean> {
  for (let step = 0; step < 36; step++) {
    const dd = getDropdown();
    if (!dd) return false;
    if (tryClickDateInDropdown(dd, y, m, d)) return true;
    const leftPanel = dd.querySelector<HTMLElement>('.ant-picker-panel');
    if (!leftPanel) return false;
    const left = parsePanelYearMonth(leftPanel);
    if (!left) return false;
    const targetV = y * 12 + (m - 1);
    const leftV = left.y * 12 + (left.m - 1);
    const prevBtn = leftPanel.querySelector<HTMLElement>(
      '.ant-picker-header-prev-btn:not(.ant-picker-header-prev-btn-disabled)',
    );
    const nextBtn = leftPanel.querySelector<HTMLElement>(
      '.ant-picker-header-next-btn:not(.ant-picker-header-next-btn-disabled)',
    );
    if (targetV < leftV && prevBtn) simulateClick(prevBtn);
    else if (targetV > leftV && nextBtn) simulateClick(nextBtn);
    else return false;
    await sleep(120);
  }
  return false;
}

/** DateTimePicker 常需要点击 OK 才会真正写回值 */
async function confirmPickerIfNeeded(dropdown: HTMLElement): Promise<void> {
  const ok = dropdown.querySelector<HTMLElement>(
    '.ant-picker-ok button:not([disabled]), .ant-picker-ok .ant-btn-primary:not([disabled])',
  );
  if (ok) {
    simulateClick(ok);
    await sleep(100);
  }
}

/** 在已打开的下拉中，若某面板正好是该年月则点击对应「日」 */
function tryClickDateInDropdown(dropdown: HTMLElement, y: number, m: number, d: number): boolean {
  for (const panel of dropdown.querySelectorAll<HTMLElement>('.ant-picker-panel')) {
    const cur = parsePanelYearMonth(panel);
    if (cur && cur.y === y && cur.m === m && clickDayInPanel(panel, d)) return true;
  }
  return false;
}

/**
 * RangePicker 双面板联动：通过左侧面板 prev/next 整块翻月，直到目标年月落在左、右面板可见范围内。
 */
async function navigateRangeMonthToward(dropdown: HTMLElement, y: number, m: number) {
  const panels = dropdown.querySelectorAll<HTMLElement>('.ant-picker-panel');
  const leftPanel = panels[0];
  if (!leftPanel) return;
  const rightPanel = panels[1] ?? leftPanel;
  const left = parsePanelYearMonth(leftPanel);
  const right = parsePanelYearMonth(rightPanel);
  if (!left || !right) return;
  const targetV = y * 12 + (m - 1);
  const leftV = left.y * 12 + (left.m - 1);
  const rightV = right.y * 12 + (right.m - 1);
  const prevBtn = leftPanel.querySelector<HTMLElement>(
    '.ant-picker-header-prev-btn:not(.ant-picker-header-prev-btn-disabled)',
  );
  const nextBtn = leftPanel.querySelector<HTMLElement>(
    '.ant-picker-header-next-btn:not(.ant-picker-header-next-btn-disabled)',
  );
  if (targetV < leftV && prevBtn) simulateClick(prevBtn);
  else if (targetV > rightV && nextBtn) simulateClick(nextBtn);
}

/** Ant Design RangePicker / ProFormDateRangePicker：同一弹层内先后点选开始、结束，不能分两次点 input 打断流程 */
async function fillDateRange(container: HTMLElement, value: string): Promise<boolean> {
  const picker =
    container.querySelector<HTMLElement>('.ant-picker.ant-picker-range') ??
    container.querySelector<HTMLElement>('.ant-picker-range');
  if (!picker || picker.classList.contains('ant-picker-disabled')) return false;

  const rangeParts = splitDateRangeValue(value);
  if (!rangeParts) return false;
  const start = parseIsoDateParts(rangeParts[0]);
  const end = parseIsoDateParts(rangeParts[1]);
  if (!start || !end) return false;

  const inputs = picker.querySelectorAll<HTMLInputElement>('.ant-picker-input input');
  const anyReadOnly = inputs.length > 0 && [...inputs].some((inp) => inp.readOnly);

  // 非 readOnly 时优先直接写入（易与 React/rc-picker 同步）
  if (inputs.length >= 2 && !anyReadOnly) {
    const a = `${start.y}-${String(start.m).padStart(2, '0')}-${String(start.d).padStart(2, '0')}`;
    const b = `${end.y}-${String(end.m).padStart(2, '0')}-${String(end.d).padStart(2, '0')}`;
    inputs[0].focus();
    setNativeValue(inputs[0], a);
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[1].focus();
    setNativeValue(inputs[1], b);
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    inputs[1].blur();
    return true;
  }

  const opener = inputs[0] ?? picker;
  simulateClick(opener);
  await sleep(400);
  let dropdown = getVisiblePickerDropdown();
  if (!dropdown) {
    simulateClick(picker);
    await sleep(400);
    dropdown = getVisiblePickerDropdown();
  }
  if (!dropdown) return false;

  for (let step = 0; step < 36; step++) {
    if (tryClickDateInDropdown(dropdown, start.y, start.m, start.d)) break;
    await navigateRangeMonthToward(dropdown, start.y, start.m);
    await sleep(100);
  }
  await sleep(220);

  for (let step = 0; step < 36; step++) {
    const dd = getVisiblePickerDropdown() ?? dropdown;
    if (tryClickDateInDropdown(dd, end.y, end.m, end.d)) break;
    await navigateRangeMonthToward(dd, end.y, end.m);
    await sleep(100);
  }

  document.body.click();
  await sleep(120);
  return true;
}

async function fillSingleDate(container: HTMLElement, value: string): Promise<boolean> {
  const picker = container.querySelector<HTMLElement>('.ant-picker:not(.ant-picker-range)');
  if (!picker || picker.classList.contains('ant-picker-disabled')) return false;

  const input = picker.querySelector<HTMLInputElement>('.ant-picker-input input, input');
  if (!input || input.disabled) return false;

  simulatePointerClick(input);
  await sleep(400);
  let dropdown = getVisiblePickerDropdown();
  if (!dropdown) {
    simulatePointerClick(picker);
    await sleep(400);
    dropdown = getVisiblePickerDropdown();
  }

  const getDd = (): HTMLElement | null => getVisiblePickerDropdown() ?? dropdown;

  const afterDayPicked = async (): Promise<boolean> => {
    await sleep(120);
    const ddTime = getVisiblePickerDropdown() ?? getDd();
    if (!ddTime) return false;
    await tryPickTimeInDropdown(ddTime, value);
    await confirmPickerIfNeeded(ddTime);
    document.body.click();
    await sleep(100);
    return true;
  };

  if (dropdown) {
    let picked = false;
    for (const ymd of localDatesFromToday(60)) {
      if (await navigateUntilDayClicked(getDd, ymd.y, ymd.m, ymd.d)) {
        picked = true;
        break;
      }
    }
    if (!picked) {
      const dateParts = parseIsoDateParts(value);
      if (dateParts) {
        picked = await navigateUntilDayClicked(getDd, dateParts.y, dateParts.m, dateParts.d);
      }
    }
    if (picked && (await afterDayPicked())) return true;
  }

  input.focus();
  setNativeValue(input, '');
  await sleep(40);
  setNativeValue(input, value.trim());
  await sleep(120);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, keyCode: 13 }));
  document.body.click();
  await sleep(80);
  return true;
}

async function fillDate(container: HTMLElement, value: string) {
  const rangeRoot =
    container.querySelector<HTMLElement>('.ant-picker.ant-picker-range') ??
    container.querySelector<HTMLElement>('.ant-picker-range');
  if (rangeRoot) return fillDateRange(container, value);
  return fillSingleDate(container, value);
}

/** 填充 Cascader 级联选择：逐级展开面板并选择 */
async function fillCascader(container: HTMLElement, _value: string) {
  const cascaderEl = container.querySelector<HTMLElement>('.ant-cascader, .ant-select');
  if (!cascaderEl || cascaderEl.classList.contains('ant-select-disabled')) return false;

  const trigger = getSelectTriggerEl(cascaderEl) ?? cascaderEl;
  trigger.focus();
  simulatePointerClick(trigger);
  await sleep(400);

  // Cascader 的下拉面板包含多列菜单
  const menus = document.querySelectorAll<HTMLElement>(
    '.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden) .ant-cascader-menu, ' +
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-cascader-menu',
  );

  if (menus.length === 0) {
    // antd 4 某些版本 cascader 下拉的 class 不同，尝试兜底
    const dropdowns = document.querySelectorAll<HTMLElement>('.ant-cascader-menus');
    for (const dd of dropdowns) {
      const cols = dd.querySelectorAll<HTMLElement>('.ant-cascader-menu');
      if (cols.length > 0) {
        for (const col of cols) {
          const items = col.querySelectorAll<HTMLElement>(
            '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled)',
          );
          if (items.length > 0) {
            const idx = Math.floor(Math.random() * items.length);
            simulateClick(items[idx]);
            await sleep(300);
          }
        }
        return true;
      }
    }
    document.body.click();
    return false;
  }

  // 逐列随机选择
  for (const menu of menus) {
    const items = menu.querySelectorAll<HTMLElement>(
      '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled)',
    );
    if (items.length > 0) {
      const idx = Math.floor(Math.random() * items.length);
      simulateClick(items[idx]);
      await sleep(350);
    }
  }

  // 选完最后一级后，检查是否有新列出现（继续选）
  for (let retry = 0; retry < 5; retry++) {
    const allMenus = document.querySelectorAll<HTMLElement>(
      '.ant-cascader-dropdown:not(.ant-cascader-dropdown-hidden) .ant-cascader-menu, ' +
      '.ant-cascader-menus .ant-cascader-menu',
    );
    const lastMenu = allMenus[allMenus.length - 1];
    if (!lastMenu) break;

    const lastItems = lastMenu.querySelectorAll<HTMLElement>(
      '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled):not(.ant-cascader-menu-item-active)',
    );
    if (lastItems.length === 0) break;

    // 如果最后一列有叶子节点（无展开箭头），点击它完成选择
    const leafItems = Array.from(lastItems).filter(
      (item) => !item.querySelector('.ant-cascader-menu-item-expand-icon'),
    );
    if (leafItems.length > 0) {
      const idx = Math.floor(Math.random() * leafItems.length);
      simulateClick(leafItems[idx]);
      await sleep(200);
      break;
    }

    // 否则继续展开
    const idx = Math.floor(Math.random() * lastItems.length);
    simulateClick(lastItems[idx]);
    await sleep(350);
  }

  return true;
}

/** 填充 TreeSelect 树选择：展开下拉后随机选择一个节点 */
async function fillTreeSelect(container: HTMLElement, _value: string) {
  const treeSelectEl = container.querySelector<HTMLElement>('.ant-tree-select, .ant-select');
  if (!treeSelectEl || treeSelectEl.classList.contains('ant-select-disabled')) return false;

  const trigger = getSelectTriggerEl(treeSelectEl) ?? treeSelectEl;
  trigger.focus();
  simulatePointerClick(trigger);
  await sleep(400);

  const dropdowns = document.querySelectorAll<HTMLElement>(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden), ' +
    '.ant-tree-select-dropdown:not(.ant-tree-select-dropdown-hidden)',
  );

  for (const dropdown of dropdowns) {
    if (dropdown.offsetHeight === 0) continue;

    // 先尝试展开一些折叠的树节点
    const switchers = dropdown.querySelectorAll<HTMLElement>(
      '.ant-select-tree-switcher.ant-select-tree-switcher_close',
    );
    if (switchers.length > 0) {
      const expandIdx = Math.floor(Math.random() * Math.min(switchers.length, 3));
      simulateClick(switchers[expandIdx]);
      await sleep(300);
    }

    // 收集所有可选的树节点
    const treeNodes = dropdown.querySelectorAll<HTMLElement>(
      '.ant-select-tree-treenode:not(.ant-select-tree-treenode-disabled)',
    );
    if (treeNodes.length === 0) continue;

    const idx = Math.floor(Math.random() * treeNodes.length);
    const target = treeNodes[idx];

    // 点击节点内容（不是展开图标）
    const content = target.querySelector<HTMLElement>('.ant-select-tree-node-content-wrapper')
      ?? target.querySelector<HTMLElement>('.ant-select-tree-title');
    if (content) {
      simulateClick(content);
      await sleep(100);
      return true;
    }

    simulateClick(target);
    await sleep(100);
    return true;
  }

  document.body.click();
  return false;
}

/** 填充 Switch 开关：根据值切换开关状态 */
async function fillSwitch(container: HTMLElement, value: string) {
  const switchEl = container.querySelector<HTMLElement>('.ant-switch');
  if (!switchEl || switchEl.classList.contains('ant-switch-disabled')) return false;

  const isChecked = switchEl.classList.contains('ant-switch-checked');
  const shouldCheck = value === 'true' || value === '1' || value === 'on';

  if (isChecked !== shouldCheck) {
    simulateClick(switchEl);
    await sleep(100);
  }
  return true;
}

/** 填充 Transfer 穿梭框：从左侧随机勾选若干项，然后点击右移按钮 */
async function fillTransfer(container: HTMLElement, _value: string) {
  const transferEl = container.querySelector<HTMLElement>('.ant-transfer');
  if (!transferEl) return false;

  // 左侧列表（源）
  const leftList = transferEl.querySelector<HTMLElement>('.ant-transfer-list:first-child');
  if (!leftList) return false;

  const leftItems = leftList.querySelectorAll<HTMLElement>(
    '.ant-transfer-list-content-item:not(.ant-transfer-list-content-item-disabled):not(.ant-transfer-list-content-item-checked)',
  );
  if (leftItems.length === 0) return true;

  // 随机选 1~3 项
  const count = Math.min(Math.floor(Math.random() * 3) + 1, leftItems.length);
  const indices = new Set<number>();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * leftItems.length));
  }

  for (const idx of indices) {
    const checkbox = leftItems[idx].querySelector<HTMLElement>('.ant-checkbox, input[type="checkbox"]');
    if (checkbox) {
      simulateClick(checkbox);
      await sleep(100);
    }
  }

  await sleep(200);

  // 点击右移按钮
  const moveRightBtn = transferEl.querySelector<HTMLElement>(
    '.ant-transfer-operation button:not([disabled])',
  );
  if (moveRightBtn) {
    simulateClick(moveRightBtn);
    await sleep(200);
  }

  return true;
}

const FILL_HANDLERS: Record<FieldType, (container: HTMLElement, value: string) => Promise<boolean>> = {
  input: fillInput,
  textarea: fillInput,
  number: fillNumber,
  select: fillSelect,
  radio: fillRadio,
  checkbox: fillCheckbox,
  date: fillDate,
  daterange: fillDate,
  cascader: fillCascader,
  treeselect: fillTreeSelect,
  switch: fillSwitch,
  transfer: fillTransfer,
  custom: async () => false,
};

/** 检测字段类型（与 scanner 保持一致） */
function detectFieldType(container: HTMLElement): FieldType | null {
  const selectors: [string, FieldType][] = [
    ['.ant-cascader', 'cascader'], ['.ant-tree-select', 'treeselect'],
    ['.ant-transfer', 'transfer'], ['.ant-switch', 'switch'],
    ['.ant-select', 'select'], ['.ant-radio-group', 'radio'],
    ['.ant-checkbox-group', 'checkbox'], ['.ant-checkbox-wrapper', 'checkbox'],
    ['.ant-picker-range', 'daterange'], ['.ant-picker', 'date'],
    ['.ant-input-number', 'number'],
    ['textarea.ant-input', 'textarea'], ['input.ant-input', 'input'],
    ['.ant-input-affix-wrapper', 'input'],
    ['input[type="text"]', 'input'], ['input[type="number"]', 'number'],
    ['input[type="email"]', 'input'], ['input[type="tel"]', 'input'],
    ['input[type="password"]', 'input'],
  ];
  for (const [sel, type] of selectors) {
    if (container.querySelector(sel)) return type;
  }
  return null;
}

/** 判断元素是否可见 */
function isVisible(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

/** 收集顶层 form-item，过滤嵌套项（与 scanner 逻辑一致） */
function collectTopLevelFormItems(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>('.ant-form-item'));
  return all.filter((item) => !item.parentElement?.closest('.ant-form-item'));
}

/** 同一 form-item 里可能存在多个可填字段（如 radio + ProFormDigit noStyle） */
function collectFillTargets(container: HTMLElement): FieldType[] {
  const targets: FieldType[] = [];
  const primary = detectFieldType(container);
  if (!primary) return targets;
  targets.push(primary);

  if (primary !== 'number' && container.querySelector('.ant-input-number')) {
    targets.push('number');
  }

  return targets;
}

/**
 * 根据 AI 生成的数据，自动填充表单。
 * 以可见的顶层 .ant-form-item 顺序匹配 field_0, field_1...
 */
export async function fillFormFields(_fields: FormFieldInfo[], data: FillData): Promise<number> {
  const allItems = collectTopLevelFormItems();
  let filledCount = 0;
  let fieldIndex = 0;

  for (const container of allItems) {
    if (!isVisible(container)) continue;
    const targets = collectFillTargets(container);
    if (targets.length === 0) continue;

    for (const type of targets) {
      const fieldId = `field_${fieldIndex}`;
      fieldIndex++;

      const value = data[fieldId];
      if (value === undefined || value === null) continue;

      const handler = FILL_HANDLERS[type];
      if (!handler) continue;

      try {
        const success = await handler(container, String(value));
        if (success) filledCount++;
        await sleep(150);
      } catch (e) {
        console.warn(`[AI Form Copilot] 填充字段 ${fieldId} 失败:`, e);
      }
    }
  }

  // 注：曾经尝试在这里做 focus → blur 触发校验渲染错误（闭环），但会干扰刚填好的
  // select / date 等受控组件（portal 关闭尚未稳定），导致整体成功率下降。
  // 现在改为纯被动读取：若页面本身已展示 .ant-form-item-explain-error，scanner
  // 会把它写入 validationError；否则不主动触发校验。

  console.log(`[AI Form Copilot] 填充完成，成功 ${filledCount} 个字段`);
  return filledCount;
}
