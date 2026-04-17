import { MessageType } from '@/shared/messages';
import type { FillFormMessage, ScanFormMessage } from '@/shared/messages';
import { fillFormFields } from './antd-adapter';
import { scanFormFields } from './scanner';

// 防止重复注入导致多次监听
if (!(window as any).__AI_FORM_COPILOT_LOADED__) {
  (window as any).__AI_FORM_COPILOT_LOADED__ = true;

  chrome.runtime.onMessage.addListener(
    (message: ScanFormMessage | FillFormMessage, _sender, sendResponse) => {
      if (message.type === MessageType.SCAN_FORM) {
        const fields = scanFormFields();
        sendResponse({ type: MessageType.SCAN_RESULT, fields });
        return true;
      }

      if (message.type === MessageType.FILL_FORM) {
        const fields = scanFormFields();
        fillFormFields(fields, message.data).then((filledCount) => {
          sendResponse({ type: MessageType.FILL_RESULT, success: true, filledCount });
        });
        return true;
      }

      return false;
    },
  );

  console.log('[AI Form Copilot] Content script loaded');
}
