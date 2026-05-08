import { describe, expect, it, vi } from 'vitest';
import { MessageType } from '@/shared/messages';
import type { PasteTextFillMessage } from '@/shared/messages';
import type { FormFieldInfo } from '@/shared/types';
import { handlePasteTextFillMessage } from '@/background/paste-fill-handler';

const fields: FormFieldInfo[] = [
  { id: 'f1', label: '产品名称', type: 'select', required: true, options: ['乐通分期'] },
  { id: 'f2', label: '资金方', type: 'select', required: true, options: ['昊悦-长银'] },
];
const text = '产品名称：乐通分期 资金方：昊悦-长银';

describe('handlePasteTextFillMessage', () => {
  it('非客服/客诉工单页：单次填充，不出现「第一阶段跳过资金方」', async () => {
    const send = vi.fn();
    send.mockImplementation(async (_tabId: number, msg: { type: string }) => {
      if (msg.type === MessageType.PASTE_FILL_PAGE_CONTEXT) {
        return {
          type: MessageType.PASTE_FILL_PAGE_CONTEXT_RESULT,
          useCsComplaintTicketProductFunderLinkage: false,
        };
      }
      if (msg.type === MessageType.FILL_FORM) {
        return { type: MessageType.FILL_RESULT, success: true, filledCount: 2 };
      }
      throw new Error(`unexpected message ${msg.type}`);
    });

    const message: PasteTextFillMessage = {
      type: MessageType.PASTE_TEXT_FILL,
      text,
      fields,
    };
    const result = await handlePasteTextFillMessage(message, {
      getActiveTab: async () => ({ id: 1 } as chrome.tabs.Tab),
      sendToContentWithFallback: send as Parameters<typeof handlePasteTextFillMessage>[1]['sendToContentWithFallback'],
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.some((c) => c[1].type === MessageType.WAIT_LINKED_FIELDS)).toBe(false);
    expect(result.data.f2).toBe('昊悦-长银');
    expect(result.mappings.some((m) => m.reason?.includes('第一阶段跳过资金方'))).toBe(false);
  });

  it('客服/客诉工单面包屑页：两阶段，首阶段映射含「第一阶段跳过资金方」', async () => {
    const send = vi.fn();
    let fillRound = 0;
    send.mockImplementation(async (_tabId: number, msg: { type: string }) => {
      if (msg.type === MessageType.PASTE_FILL_PAGE_CONTEXT) {
        return {
          type: MessageType.PASTE_FILL_PAGE_CONTEXT_RESULT,
          useCsComplaintTicketProductFunderLinkage: true,
        };
      }
      if (msg.type === MessageType.FILL_FORM) {
        fillRound += 1;
        return { type: MessageType.FILL_RESULT, success: true, filledCount: 1 };
      }
      if (msg.type === MessageType.WAIT_LINKED_FIELDS) {
        return {
          type: MessageType.WAIT_LINKED_FIELDS_RESULT,
          fields,
          timedOut: false,
        };
      }
      throw new Error(`unexpected message ${msg.type}`);
    });

    const message: PasteTextFillMessage = {
      type: MessageType.PASTE_TEXT_FILL,
      text,
      fields,
    };
    const result = await handlePasteTextFillMessage(message, {
      getActiveTab: async () => ({ id: 1 } as chrome.tabs.Tab),
      sendToContentWithFallback: send as Parameters<typeof handlePasteTextFillMessage>[1]['sendToContentWithFallback'],
    });

    expect(send).toHaveBeenCalledTimes(4);
    expect(result.mappings.some((m) => m.reason === '第一阶段跳过资金方，等待产品联动')).toBe(true);
    expect(result.data.f2).toBe('昊悦-长银');
  });
});
