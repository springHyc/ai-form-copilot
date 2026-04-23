import type { FieldMappingResult } from '@/shared/types';

export interface PasteFillSummary {
  totalMappings: number;
  autoFilled: number;
  skipped: number;
  averageConfidence: number;
  lowConfidenceCount: number;
  topSkipReasons: string[];
}

export function buildPasteFillSummary(mappings: FieldMappingResult[]): PasteFillSummary {
  const totalMappings = mappings.length;
  const autoFilled = mappings.filter((item) => item.autoFilled).length;
  const skipped = totalMappings - autoFilled;
  const confidenceSum = mappings.reduce((sum, item) => sum + item.confidence, 0);
  const averageConfidence = totalMappings > 0 ? confidenceSum / totalMappings : 0;
  const lowConfidenceCount = mappings.filter((item) => item.confidence < 0.7).length;

  const reasonCounter = new Map<string, number>();
  for (const mapping of mappings) {
    if (mapping.autoFilled) continue;
    const key = mapping.reason || '未命中';
    reasonCounter.set(key, (reasonCounter.get(key) ?? 0) + 1);
  }
  const topSkipReasons = Array.from(reasonCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => `${reason} (${count})`);

  return {
    totalMappings,
    autoFilled,
    skipped,
    averageConfidence,
    lowConfidenceCount,
    topSkipReasons,
  };
}
