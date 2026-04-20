import { MessageType } from '@/shared/messages';
import type { FillFormMessage, GenerateDataMessage, Message } from '@/shared/messages';
import { generateWithAI } from '@/shared/ai-service';
import { generateMockData } from '@/utils/mock-rules';

/** 获取当前活跃标签页 */
async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('无法获取当前标签页');
  return tab;
}

/**
 * 通过 chrome.scripting.executeScript 在目标页面中执行扫描。
 * 不依赖预注入的 content script，每次主动注入执行，100% 可靠。
 */
async function executeScanInPage(): Promise<{ fields: any[] }> {
  const tab = await getActiveTab();

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: () => {
      type FieldType = 'input' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'daterange' | 'number' | 'cascader' | 'treeselect' | 'switch' | 'transfer' | 'custom';

      function detectFieldType(c: HTMLElement): { type: FieldType; element: HTMLElement } | null {
        const map: [string, FieldType][] = [
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
        for (const [sel, type] of map) {
          const el = c.querySelector<HTMLElement>(sel);
          if (el) return { type, element: el };
        }
        return null;
      }

      function extractLabel(c: HTMLElement): string {
        const el = c.querySelector(':scope > .ant-row > .ant-form-item-label label')
          ?? c.querySelector(':scope > .ant-form-item-label label')
          ?? c.querySelector('.ant-form-item-label label')
          ?? c.querySelector('label');
        return (el?.textContent?.trim() ?? '').replace(/^\*\s*/, '').replace(/[：:]$/, '');
      }

      function isRequired(c: HTMLElement): boolean {
        if (c.querySelector('.ant-form-item-required')) return true;
        const inp = c.querySelector('input, select, textarea');
        return inp?.getAttribute('aria-required') === 'true';
      }

      function extractOptions(c: HTMLElement, type: FieldType): string[] {
        if (type === 'radio')
          return Array.from(c.querySelectorAll('.ant-radio-wrapper')).map(e => {
            const span = e.querySelector(':scope > span:not(.ant-radio)');
            return (span?.textContent?.trim() ?? e.textContent?.trim() ?? '');
          }).filter(Boolean);
        if (type === 'checkbox')
          return Array.from(c.querySelectorAll('.ant-checkbox-wrapper')).map(e => {
            const span = e.querySelector(':scope > span:not(.ant-checkbox)');
            return (span?.textContent?.trim() ?? e.textContent?.trim() ?? '');
          }).filter(Boolean);
        if (type === 'select') {
          const t = c.querySelector('.ant-select-selection-item')?.textContent?.trim();
          return t ? [t] : [];
        }
        return [];
      }

      function extractExtra(c: HTMLElement): string | undefined {
        const el = c.querySelector('.ant-form-item-extra');
        const text = el?.textContent?.trim();
        return text || undefined;
      }

      function extractConstraints(element: HTMLElement, fieldType: FieldType): { maxLength?: number; min?: number; max?: number } | undefined {
        let input: HTMLInputElement | null = null;
        if (fieldType === 'number') {
          input = element.querySelector<HTMLInputElement>('.ant-input-number-input')
            ?? (element.tagName === 'INPUT' ? element as HTMLInputElement : null);
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          input = element as HTMLInputElement;
        } else {
          input = element.querySelector('input');
        }
        if (!input) return undefined;
        const constraints: { maxLength?: number; min?: number; max?: number } = {};
        if (input.maxLength > 0 && input.maxLength < 524288) constraints.maxLength = input.maxLength;
        const minAttr = input.getAttribute('min');
        const maxAttr = input.getAttribute('max');
        if (minAttr !== null && minAttr !== '' && !Number.isNaN(Number(minAttr))) constraints.min = Number(minAttr);
        if (maxAttr !== null && maxAttr !== '' && !Number.isNaN(Number(maxAttr))) constraints.max = Number(maxAttr);
        return Object.keys(constraints).length > 0 ? constraints : undefined;
      }

      function isVisible(el: HTMLElement): boolean {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
        if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;
        const r = el.getBoundingClientRect();
        return r.width > 0 || r.height > 0;
      }

      // 只用精确 .ant-form-item，过滤嵌套项（ProFormDependency 内部的子 form-item）
      const allItems = Array.from(document.querySelectorAll<HTMLElement>('.ant-form-item'));
      const items = allItems.filter(item => !item.parentElement?.closest('.ant-form-item'));
      const fields: any[] = [];
      let idx = 0;

      items.forEach(container => {
        if (!isVisible(container)) return;
        const det = detectFieldType(container);
        if (!det) return;

        const label = extractLabel(container);
        const { type, element } = det;
        const placeholder = element.getAttribute('placeholder')
          ?? element.querySelector('input')?.getAttribute('placeholder') ?? undefined;
        if (!label && !placeholder) return;

        const options = extractOptions(container, type);
        const extra = extractExtra(container);
        const constraints = extractConstraints(element, type);
        let currentValue: string | undefined;
        if (type === 'input' || type === 'textarea' || type === 'number') {
          const inp = type === 'number'
            ? (element.querySelector<HTMLInputElement>('.ant-input-number-input')
              ?? element.querySelector('input') as HTMLInputElement)
            : ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')
              ? element as HTMLInputElement : element.querySelector('input') as HTMLInputElement);
          currentValue = inp?.value || undefined;
        } else if (type === 'select') {
          currentValue = container.querySelector('.ant-select-selection-item')?.textContent?.trim() || undefined;
        } else if (type === 'date' || type === 'daterange') {
          const dateInputs = element.querySelectorAll<HTMLInputElement>('input');
          currentValue = Array.from(dateInputs).map(inp => inp.value).filter(Boolean).join(',') || undefined;
        } else if (type === 'cascader') {
          currentValue = container.querySelector('.ant-cascader-picker-label')?.textContent?.trim()
            || container.querySelector('.ant-select-selection-item')?.textContent?.trim() || undefined;
        } else if (type === 'treeselect') {
          currentValue = container.querySelector('.ant-select-selection-item')?.textContent?.trim() || undefined;
        } else if (type === 'switch') {
          const sw = container.querySelector('.ant-switch');
          currentValue = sw?.classList.contains('ant-switch-checked') ? 'true' : 'false';
        } else if (type === 'transfer') {
          const ri = container.querySelectorAll('.ant-transfer-list:last-child .ant-transfer-list-content-item');
          currentValue = ri.length > 0 ? `${ri.length} 项已选` : undefined;
        }

        fields.push({
          id: `field_${idx}`, label: label || placeholder || `未命名字段_${idx}`,
          type, required: isRequired(container), placeholder, extra,
          options: options.length > 0 ? options : undefined, constraints, currentValue,
        });
        idx++;
      });

      console.log(`[AI Form Copilot] 扫描到 ${fields.length} 个字段:`,
        fields.map((f: any) => `${f.label}(${f.type})`).join(', '));
      return { fields };
    },
  });

  return results[0]?.result ?? { fields: [] };
}

/** 确保 content script 已注入，然后发送消息 */
async function sendToContentWithFallback<T>(tabId: number, message: Message): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    console.warn('[AI Form Copilot] Background -> Content 消息失败，尝试注入 content.js 后重试:', {
      tabId,
      messageType: (message as any)?.type,
      error: e,
    });
    // content script 未加载，注入后重试
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    await new Promise(r => setTimeout(r, 300));
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (e2) {
      console.error('[AI Form Copilot] Background -> Content 重试仍失败:', {
        tabId,
        messageType: (message as any)?.type,
        error: e2,
      });
      throw e2;
    }
  }
}

/** 处理来自 Popup 的消息 */
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (message.type) {
        case MessageType.SCAN_FORM: {
          const tab = await getActiveTab();
          const result = await sendToContentWithFallback<{ type: MessageType.SCAN_RESULT; fields: any[] }>(
            tab.id!,
            { type: MessageType.SCAN_FORM },
          );
          sendResponse({ type: MessageType.SCAN_RESULT, fields: result.fields });
          break;
        }

        case MessageType.GENERATE_DATA: {
          const { fields, aiConfig } = message as GenerateDataMessage;
          const data = aiConfig.apiKey
            ? await generateWithAI(fields, aiConfig)
            : generateMockData(fields);
          sendResponse({ type: MessageType.GENERATE_RESULT, data });
          break;
        }

        case MessageType.FILL_FORM: {
          const tab = await getActiveTab();
          const result = await sendToContentWithFallback(tab.id!, message);
          sendResponse(result);
          break;
        }

        default:
          sendResponse({ type: MessageType.ERROR, error: '未知消息类型' });
      }
    } catch (error) {
      console.error('[AI Form Copilot] Background error:', {
        messageType: (message as any)?.type,
        error,
      });
      sendResponse({
        type: MessageType.ERROR,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  handleAsync();
  return true;
});

console.log('[AI Form Copilot] Background service worker loaded');
