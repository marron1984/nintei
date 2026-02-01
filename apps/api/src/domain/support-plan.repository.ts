/**
 * SupportPlan Repository Interface
 * インフラ層との分離のためのリポジトリパターン
 */

import type { SupportTaskType, TaskStatus, EvidenceKind } from './support-task.types.js';

// ==================== Entity Types ====================

export interface SupportPlanTemplateEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  language: string;
  isDefault: boolean;
  isActive: boolean;
  status: string;
  version: number;
  items: SupportPlanItemTemplateEntity[];
}

export interface SupportPlanItemTemplateEntity {
  id: string;
  templateId: string;
  itemNumber: number;
  type: SupportTaskType;
  title: string;
  titleTranslations: Record<string, string>;
  description: string;
  descriptionTranslations: Record<string, string>;
  defaultMethod: string | null;
  defaultDueDays: number | null;
  requiredDocuments: string[];
  requiresConsent: boolean;
  frequency: string | null;
}

export interface SupportPlanEntity {
  id: string;
  tenantId: string;
  foreignWorkerId: string;
  templateId: string | null;
  status: string;
  startDate: Date;
  endDate: Date | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: SupportPlanItemEntity[];
  tasks: SupportTaskEntity[];
}

export interface SupportPlanItemEntity {
  id: string;
  planId: string;
  itemNumber: number;
  type: SupportTaskType;
  title: string;
  description: string;
  method: string | null;
  customNotes: string | null;
  status: string;
}

export interface SupportTaskEntity {
  id: string;
  tenantId: string;
  supportPlanId: string;
  planItemId: string | null;
  foreignWorkerId: string;
  assigneeId: string | null;
  createdById: string;
  type: SupportTaskType;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  method: string | null;
  status: TaskStatus;
  priority: string;
  consentRequired: boolean;
  consentObtainedAt: Date | null;
  consentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  evidence: EvidenceEntity[];
}

export interface EvidenceEntity {
  id: string;
  tenantId: string;
  supportTaskId: string | null;
  interviewId: string | null;
  consultationId: string | null;
  documentId: string | null;
  kind: EvidenceKind;
  note: string | null;
  fileKey: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  url: string | null;
  description: string | null;
  category: string | null;
  createdByUserId: string;
  createdAt: Date;
}

export interface ForeignWorkerEntity {
  id: string;
  tenantId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  nativeLanguage: string;
}

// ==================== Repository Interface ====================

export interface SupportPlanRepository {
  // Template operations
  findTemplateById(id: string, tenantId: string): Promise<SupportPlanTemplateEntity | null>;
  findActiveTemplate(tenantId: string, language?: string): Promise<SupportPlanTemplateEntity | null>;

  // Support Plan operations
  createSupportPlan(data: CreateSupportPlanData): Promise<SupportPlanEntity>;
  findSupportPlanById(id: string, tenantId: string): Promise<SupportPlanEntity | null>;
  findSupportPlanByForeignWorkerId(foreignWorkerId: string, tenantId: string): Promise<SupportPlanEntity | null>;

  // Support Task operations
  createSupportTask(data: CreateSupportTaskData): Promise<SupportTaskEntity>;
  findTaskById(id: string, tenantId: string): Promise<SupportTaskEntity | null>;
  updateTaskStatus(id: string, status: TaskStatus, completedAt?: Date | null): Promise<SupportTaskEntity>;

  // Evidence operations
  createEvidence(data: CreateEvidenceData): Promise<EvidenceEntity>;
  findEvidenceByTaskId(taskId: string): Promise<EvidenceEntity[]>;

  // Foreign Worker operations
  findForeignWorkerById(id: string, tenantId: string): Promise<ForeignWorkerEntity | null>;
}

// ==================== Input Types ====================

export interface CreateSupportPlanData {
  tenantId: string;
  foreignWorkerId: string;
  templateId: string | null;
  startDate: Date;
  endDate: Date | null;
  createdBy: string;
  status: string;
  items: CreateSupportPlanItemData[];
  tasks: CreateSupportTaskData[];
}

export interface CreateSupportPlanItemData {
  itemNumber: number;
  type: SupportTaskType;
  title: string;
  description: string;
  method: string | null;
  status: string;
}

export interface CreateSupportTaskData {
  tenantId: string;
  supportPlanId: string;
  planItemId: string | null;
  foreignWorkerId: string;
  assigneeId: string | null;
  createdById: string;
  type: SupportTaskType;
  title: string;
  description: string | null;
  dueDate: Date | null;
  method: string | null;
  status: TaskStatus;
  priority: string;
  consentRequired: boolean;
}

export interface CreateEvidenceData {
  tenantId: string;
  supportTaskId: string;
  kind: EvidenceKind;
  note: string | null;
  fileKey: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  url: string | null;
  description: string | null;
  category: string | null;
  createdByUserId: string;
}
