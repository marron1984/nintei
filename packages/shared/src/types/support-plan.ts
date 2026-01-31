/**
 * 支援計画関連の型定義
 * 特定技能外国人の支援10項目をカバー
 */

export interface SupportPlanTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  items: SupportPlanItemTemplate[];
  isDefault: boolean;
  status: TemplateStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateStatus = 'draft' | 'active' | 'archived';

export interface SupportPlanItemTemplate {
  itemNumber: number; // 1-10
  category: SupportCategory;
  title: string;
  titleTranslations: Record<string, string>; // 多言語タイトル
  description: string;
  descriptionTranslations: Record<string, string>;
  defaultMethod?: string;
  requiredDocuments: string[];
  requiresConsent: boolean;
  frequency?: SupportFrequency;
}

export type SupportCategory =
  | 'pre_entry' // 入国前
  | 'arrival' // 入国時
  | 'living' // 生活支援
  | 'employment' // 就労支援
  | 'japanese_learning' // 日本語学習
  | 'consultation' // 相談・苦情
  | 'community' // 地域交流
  | 'career' // 転職支援
  | 'departure' // 帰国支援
  | 'regular_interview'; // 定期面談

export type SupportFrequency = 'once' | 'monthly' | 'quarterly' | 'yearly' | 'as_needed';

export interface SupportPlan {
  id: string;
  tenantId: string;
  workerId: string;
  templateId?: string;
  status: PlanStatus;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanStatus = 'draft' | 'pending_approval' | 'active' | 'completed' | 'cancelled';

export interface SupportPlanItem {
  id: string;
  planId: string;
  itemNumber: number;
  category: SupportCategory;
  title: string;
  description: string;
  method?: string;
  customNotes?: string;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface SupportTask {
  id: string;
  planItemId: string;
  workerId: string;
  assigneeId: string;
  title: string;
  description?: string;
  dueDate: Date;
  completedAt?: Date;
  method?: string;
  status: TaskStatus;
  priority: TaskPriority;
  // 証跡
  attachments: string[];
  // 本人同意
  consentRequired: boolean;
  consentObtainedAt?: Date;
  consentMethod?: ConsentMethod;
  consentEvidence?: string; // 同意書類のURL
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ConsentMethod = 'written' | 'electronic' | 'verbal';

export interface CreateSupportPlanInput {
  workerId: string;
  templateId?: string;
  startDate: Date;
  endDate?: Date;
  customItems?: Partial<SupportPlanItemTemplate>[];
}

export interface CreateTaskInput {
  planItemId: string;
  assigneeId: string;
  title: string;
  description?: string;
  dueDate: Date;
  method?: string;
  priority?: TaskPriority;
  consentRequired?: boolean;
}
