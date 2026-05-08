import { MessageType } from '@/shared/messages';
import type {
  FillFormMessage,
  PasteFillPageContextMessage,
  ScanFormMessage,
  WaitLinkedFieldsMessage,
} from '@/shared/messages';
import { fillFormFields } from './antd-adapter';
import { isCsComplaintTicketBreadcrumbContext } from './cs-complaint-ticket-page';
import { waitForLinkedFields } from './paste-fill-linked-state';
import { scanFormFields } from './scanner';

// 防止重复注入导致多次监听
if (!(window as any).__AI_FORM_COPILOT_LOADED__) {
  (window as any).__AI_FORM_COPILOT_LOADED__ = true;

  chrome.runtime.onMessage.addListener(
    (
      message: ScanFormMessage | FillFormMessage | WaitLinkedFieldsMessage | PasteFillPageContextMessage,
      _sender,
      sendResponse,
    ) => {
      if (message.type === MessageType.PASTE_FILL_PAGE_CONTEXT) {
        try {
          sendResponse({
            type: MessageType.PASTE_FILL_PAGE_CONTEXT_RESULT,
            useCsComplaintTicketProductFunderLinkage: isCsComplaintTicketBreadcrumbContext(),
          });
        } catch (e) {
          console.error('[AI Form Copilot] Content 粘贴页语境查询失败:', e);
          sendResponse({ type: MessageType.ERROR, error: e instanceof Error ? e.message : String(e) });
        }
        return true;
      }

      if (message.type === MessageType.SCAN_FORM) {
        try {
          const fields = scanFormFields();
          sendResponse({ type: MessageType.SCAN_RESULT, fields });
        } catch (e) {
          console.error('[AI Form Copilot] Content 扫描失败:', e);
          sendResponse({ type: MessageType.ERROR, error: e instanceof Error ? e.message : String(e) });
        }
        return true;
      }

      if (message.type === MessageType.FILL_FORM) {
        try {
          const fields = scanFormFields();
          fillFormFields(fields, message.data).then((filledCount) => {
            sendResponse({ type: MessageType.FILL_RESULT, success: true, filledCount });
          }).catch((e) => {
            console.error('[AI Form Copilot] Content 填充失败:', e);
            sendResponse({ type: MessageType.ERROR, error: e instanceof Error ? e.message : String(e) });
          });
        } catch (e) {
          console.error('[AI Form Copilot] Content 填充启动失败:', e);
          sendResponse({ type: MessageType.ERROR, error: e instanceof Error ? e.message : String(e) });
        }
        return true;
      }

      if (message.type === MessageType.WAIT_LINKED_FIELDS) {
        waitForLinkedFields({
          expectedLabels: message.expectedLabels,
          timeoutMs: message.timeoutMs,
          pollMs: message.pollMs,
        }).then((result) => {
          sendResponse({
            type: MessageType.WAIT_LINKED_FIELDS_RESULT,
            fields: result.fields,
            timedOut: result.timedOut,
          });
        }).catch((e) => {
          console.error('[AI Form Copilot] Content 联动等待失败:', e);
          sendResponse({ type: MessageType.ERROR, error: e instanceof Error ? e.message : String(e) });
        });
        return true;
      }

      return false;
    },
  );

  console.log('[AI Form Copilot] Content script loaded');
}
