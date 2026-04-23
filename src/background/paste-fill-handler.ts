import { MessageType } from '@/shared/messages';
import type {
  FillData,
  FormFieldInfo,
} from '@/shared/types';
import type {
  Message,
  PasteTextFillMessage,
  PasteTextFillResultMessage,
} from '@/shared/messages';
import { buildPastedTextMappingPlan } from '@/paste-fill/field-mapper';

interface PasteFillHandlerDeps {
  getActiveTab: () => Promise<chrome.tabs.Tab>;
  sendToContentWithFallback: <T>(tabId: number, message: Message) => Promise<T>;
}

function mergeFillData(base: FillData, next: FillData): FillData {
  return { ...base, ...next };
}

async function scanFields(
  deps: PasteFillHandlerDeps,
  tabId: number,
): Promise<FormFieldInfo[]> {
  const response = await deps.sendToContentWithFallback<{ type: MessageType.SCAN_RESULT; fields: FormFieldInfo[] }>(
    tabId,
    { type: MessageType.SCAN_FORM },
  );
  return response.fields ?? [];
}

async function fillDataInPage(
  deps: PasteFillHandlerDeps,
  tabId: number,
  data: FillData,
): Promise<number> {
  if (Object.keys(data).length === 0) return 0;
  const response = await deps.sendToContentWithFallback<{ type: MessageType.FILL_RESULT; filledCount: number }>(
    tabId,
    { type: MessageType.FILL_FORM, data },
  );
  return response.filledCount ?? 0;
}

export async function handlePasteTextFillMessage(
  message: PasteTextFillMessage,
  deps: PasteFillHandlerDeps,
): Promise<PasteTextFillResultMessage> {
  const tab = await deps.getActiveTab();
  const tabId = tab.id!;
  const initialFields = message.fields.length > 0 ? message.fields : await scanFields(deps, tabId);

  const firstPlan = buildPastedTextMappingPlan(initialFields, message.text, {
    issueTree: message.issueTree,
    includeFunder: false,
  });

  let filledCount = await fillDataInPage(deps, tabId, firstPlan.data);
  let mergedData: FillData = { ...firstPlan.data };

  const linkedState = await deps.sendToContentWithFallback<{
    type: MessageType.WAIT_LINKED_FIELDS_RESULT;
    fields: FormFieldInfo[];
    timedOut: boolean;
  }>(tabId, {
    type: MessageType.WAIT_LINKED_FIELDS,
    expectedLabels: ['资金方'],
    timeoutMs: 2200,
    pollMs: 180,
  });
  const linkedFields = linkedState.fields ?? await scanFields(deps, tabId);

  const secondPlan = buildPastedTextMappingPlan(linkedFields, message.text, {
    issueTree: message.issueTree,
    includeFunder: true,
    onlyFunder: true,
  });
  if (linkedState.timedOut && secondPlan.mappings.length === 0) {
    secondPlan.mappings.push({
      fieldId: '',
      fieldLabel: '资金方',
      autoFilled: false,
      confidence: 0.3,
      reason: '联动等待超时，未检测到资金方字段',
    });
  }
  const secondFilled = await fillDataInPage(deps, tabId, secondPlan.data);
  filledCount += secondFilled;
  mergedData = mergeFillData(mergedData, secondPlan.data);

  return {
    type: MessageType.PASTE_TEXT_FILL_RESULT,
    success: true,
    filledCount,
    data: mergedData,
    mappings: [...firstPlan.mappings, ...secondPlan.mappings],
    slots: firstPlan.slots,
    classification: firstPlan.classification,
  };
}
