import type { FormFieldInfo } from '@/shared/types';
import { scanFormFields } from './scanner';

interface WaitLinkedFieldsOptions {
  expectedLabels: string[];
  timeoutMs?: number;
  pollMs?: number;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

function hasAllExpected(fields: FormFieldInfo[], expectedLabels: string[]): boolean {
  if (expectedLabels.length === 0) return true;
  const normalizedLabels = fields.map((field) => normalize(field.label));
  return expectedLabels.every((label) => {
    const expected = normalize(label);
    return normalizedLabels.some((candidate) => candidate.includes(expected) || expected.includes(candidate));
  });
}

export async function waitForLinkedFields(options: WaitLinkedFieldsOptions): Promise<{
  fields: FormFieldInfo[];
  timedOut: boolean;
}> {
  const timeoutMs = options.timeoutMs ?? 2200;
  const pollMs = options.pollMs ?? 180;
  const start = Date.now();
  let latest = scanFormFields();

  while (Date.now() - start <= timeoutMs) {
    if (hasAllExpected(latest, options.expectedLabels)) {
      return { fields: latest, timedOut: false };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    latest = scanFormFields();
  }
  return { fields: latest, timedOut: true };
}
