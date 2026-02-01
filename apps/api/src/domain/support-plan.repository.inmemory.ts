/**
 * InMemory Repository Implementation
 * テスト用のメモリ内リポジトリ
 */

import type {
  SupportPlanRepository,
  SupportPlanTemplateEntity,
  SupportPlanEntity,
  SupportTaskEntity,
  EvidenceEntity,
  ForeignWorkerEntity,
  CreateSupportPlanData,
  CreateSupportTaskData,
  CreateEvidenceData,
} from './support-plan.repository.js';
import type { TaskStatus } from './support-task.types.js';

function generateId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class InMemorySupportPlanRepository implements SupportPlanRepository {
  private templates: Map<string, SupportPlanTemplateEntity> = new Map();
  private plans: Map<string, SupportPlanEntity> = new Map();
  private tasks: Map<string, SupportTaskEntity> = new Map();
  private evidence: Map<string, EvidenceEntity> = new Map();
  private foreignWorkers: Map<string, ForeignWorkerEntity> = new Map();

  // ==================== Setup Methods ====================

  addTemplate(template: SupportPlanTemplateEntity): void {
    this.templates.set(template.id, template);
  }

  addForeignWorker(worker: ForeignWorkerEntity): void {
    this.foreignWorkers.set(worker.id, worker);
  }

  addTask(task: SupportTaskEntity): void {
    this.tasks.set(task.id, task);
  }

  getTask(id: string): SupportTaskEntity | undefined {
    return this.tasks.get(id);
  }

  getPlan(id: string): SupportPlanEntity | undefined {
    return this.plans.get(id);
  }

  getEvidence(id: string): EvidenceEntity | undefined {
    return this.evidence.get(id);
  }

  clear(): void {
    this.templates.clear();
    this.plans.clear();
    this.tasks.clear();
    this.evidence.clear();
    this.foreignWorkers.clear();
  }

  // ==================== Repository Interface Implementation ====================

  async findTemplateById(
    id: string,
    tenantId: string
  ): Promise<SupportPlanTemplateEntity | null> {
    const template = this.templates.get(id);
    if (template && template.tenantId === tenantId) {
      return template;
    }
    return null;
  }

  async findActiveTemplate(
    tenantId: string,
    language?: string
  ): Promise<SupportPlanTemplateEntity | null> {
    for (const template of this.templates.values()) {
      if (
        template.tenantId === tenantId &&
        template.isActive &&
        (language === undefined || template.language === language)
      ) {
        return template;
      }
    }
    // Fall back to any active template
    for (const template of this.templates.values()) {
      if (template.tenantId === tenantId && template.isActive) {
        return template;
      }
    }
    return null;
  }

  async createSupportPlan(data: CreateSupportPlanData): Promise<SupportPlanEntity> {
    const planId = generateId();
    const now = new Date();

    // Create plan items
    const items = data.items.map((item, index) => ({
      id: generateId(),
      planId,
      itemNumber: item.itemNumber,
      type: item.type,
      title: item.title,
      description: item.description,
      method: item.method,
      customNotes: null,
      status: item.status,
    }));

    // Create tasks with proper planId
    const tasks: SupportTaskEntity[] = data.tasks.map((taskData, index) => {
      const taskId = generateId();
      const task: SupportTaskEntity = {
        id: taskId,
        tenantId: taskData.tenantId,
        supportPlanId: planId,
        planItemId: items[index]?.id ?? null,
        foreignWorkerId: taskData.foreignWorkerId,
        assigneeId: taskData.assigneeId,
        createdById: taskData.createdById,
        type: taskData.type,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        completedAt: null,
        method: taskData.method,
        status: taskData.status,
        priority: taskData.priority,
        consentRequired: taskData.consentRequired,
        consentObtainedAt: null,
        consentMethod: null,
        createdAt: now,
        updatedAt: now,
        evidence: [],
      };
      this.tasks.set(taskId, task);
      return task;
    });

    const plan: SupportPlanEntity = {
      id: planId,
      tenantId: data.tenantId,
      foreignWorkerId: data.foreignWorkerId,
      templateId: data.templateId,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      createdBy: data.createdBy,
      approvedBy: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
      items,
      tasks,
    };

    this.plans.set(planId, plan);
    return plan;
  }

  async findSupportPlanById(id: string, tenantId: string): Promise<SupportPlanEntity | null> {
    const plan = this.plans.get(id);
    if (plan && plan.tenantId === tenantId) {
      return plan;
    }
    return null;
  }

  async findSupportPlanByForeignWorkerId(
    foreignWorkerId: string,
    tenantId: string
  ): Promise<SupportPlanEntity | null> {
    for (const plan of this.plans.values()) {
      if (plan.foreignWorkerId === foreignWorkerId && plan.tenantId === tenantId) {
        return plan;
      }
    }
    return null;
  }

  async createSupportTask(data: CreateSupportTaskData): Promise<SupportTaskEntity> {
    const now = new Date();
    const task: SupportTaskEntity = {
      id: generateId(),
      tenantId: data.tenantId,
      supportPlanId: data.supportPlanId,
      planItemId: data.planItemId,
      foreignWorkerId: data.foreignWorkerId,
      assigneeId: data.assigneeId,
      createdById: data.createdById,
      type: data.type,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      completedAt: null,
      method: data.method,
      status: data.status,
      priority: data.priority,
      consentRequired: data.consentRequired,
      consentObtainedAt: null,
      consentMethod: null,
      createdAt: now,
      updatedAt: now,
      evidence: [],
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async findTaskById(id: string, tenantId: string): Promise<SupportTaskEntity | null> {
    const task = this.tasks.get(id);
    if (task && task.tenantId === tenantId) {
      // Include latest evidence
      const evidenceList = Array.from(this.evidence.values()).filter(
        (e) => e.supportTaskId === id
      );
      return { ...task, evidence: evidenceList };
    }
    return null;
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    completedAt?: Date | null
  ): Promise<SupportTaskEntity> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('Task not found');
    }

    const updatedTask: SupportTaskEntity = {
      ...task,
      status,
      completedAt: completedAt ?? task.completedAt,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async createEvidence(data: CreateEvidenceData): Promise<EvidenceEntity> {
    const evidence: EvidenceEntity = {
      id: generateId(),
      tenantId: data.tenantId,
      supportTaskId: data.supportTaskId,
      interviewId: null,
      consultationId: null,
      documentId: null,
      kind: data.kind,
      note: data.note,
      fileKey: data.fileKey,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      fileUrl: data.fileUrl,
      url: data.url,
      description: data.description,
      category: data.category,
      createdByUserId: data.createdByUserId,
      createdAt: new Date(),
    };
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  async findEvidenceByTaskId(taskId: string): Promise<EvidenceEntity[]> {
    return Array.from(this.evidence.values()).filter((e) => e.supportTaskId === taskId);
  }

  async findForeignWorkerById(
    id: string,
    tenantId: string
  ): Promise<ForeignWorkerEntity | null> {
    const worker = this.foreignWorkers.get(id);
    if (worker && worker.tenantId === tenantId) {
      return worker;
    }
    return null;
  }
}
