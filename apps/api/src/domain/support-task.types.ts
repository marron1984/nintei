/**
 * 支援10項目のタイプ定義（type-safe, any禁止）
 */

export const SUPPORT_TASK_TYPES = [
  'pre_entry_guidance',      // 1. 事前ガイダンス
  'airport_pickup',          // 2. 出入国する際の送迎
  'housing_support',         // 3. 住居確保・生活に必要な契約支援
  'life_orientation',        // 4. 生活オリエンテーション
  'official_procedures',     // 5. 公的手続等への同行
  'japanese_learning',       // 6. 日本語学習の機会の提供
  'consultation_complaints', // 7. 相談・苦情への対応
  'japanese_community',      // 8. 日本人との交流促進
  'job_change_support',      // 9. 転職支援（非自発的離職時）
  'regular_interviews',      // 10. 定期的な面談の実施
] as const;

export type SupportTaskType = (typeof SUPPORT_TASK_TYPES)[number];

export const SUPPORT_TASK_TYPE_LABELS: Record<SupportTaskType, { ja: string; en: string }> = {
  pre_entry_guidance: { ja: '事前ガイダンス', en: 'Pre-entry Guidance' },
  airport_pickup: { ja: '出入国する際の送迎', en: 'Airport Pickup/Dropoff' },
  housing_support: { ja: '住居確保・生活契約支援', en: 'Housing Support' },
  life_orientation: { ja: '生活オリエンテーション', en: 'Life Orientation' },
  official_procedures: { ja: '公的手続等への同行', en: 'Official Procedures Support' },
  japanese_learning: { ja: '日本語学習の機会の提供', en: 'Japanese Learning Opportunities' },
  consultation_complaints: { ja: '相談・苦情への対応', en: 'Consultation & Complaints' },
  japanese_community: { ja: '日本人との交流促進', en: 'Japanese Community Integration' },
  job_change_support: { ja: '転職支援', en: 'Job Change Support' },
  regular_interviews: { ja: '定期的な面談', en: 'Regular Interviews' },
};

export function isSupportTaskType(value: unknown): value is SupportTaskType {
  return typeof value === 'string' && SUPPORT_TASK_TYPES.includes(value as SupportTaskType);
}

// タスクステータス
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}

// エビデンス種別
export const EVIDENCE_KINDS = ['file', 'note', 'url'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export function isEvidenceKind(value: unknown): value is EvidenceKind {
  return typeof value === 'string' && EVIDENCE_KINDS.includes(value as EvidenceKind);
}
