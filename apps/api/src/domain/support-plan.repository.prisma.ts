/**
 * Prisma Repository Implementation
 * 本番用のPrismaベースリポジトリ
 */

import type { PrismaClient } from '@prisma/client';
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
  SupportPlanItemEntity,
  SupportPlanItemTemplateEntity,
} from './support-plan.repository.js';
import type { TaskStatus, SupportTaskType } from './support-task.types.js';

export class PrismaSupportPlanRepository implements SupportPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findTemplateById(
    id: string,
    tenantId: string
  ): Promise<SupportPlanTemplateEntity | null> {
    const template = await this.prisma.supportPlanTemplate.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: { itemNumber: 'asc' } } },
    });

    if (!template) return null;

    return this.mapTemplate(template);
  }

  async findActiveTemplate(
    tenantId: string,
    language?: string
  ): Promise<SupportPlanTemplateEntity | null> {
    // First try to find template matching language
    if (language) {
      const template = await this.prisma.supportPlanTemplate.findFirst({
        where: { tenantId, isActive: true, language },
        include: { items: { orderBy: { itemNumber: 'asc' } } },
      });
      if (template) return this.mapTemplate(template);
    }

    // Fall back to default or any active template
    const template = await this.prisma.supportPlanTemplate.findFirst({
      where: { tenantId, isActive: true },
      include: { items: { orderBy: { itemNumber: 'asc' } } },
      orderBy: { isDefault: 'desc' },
    });

    if (!template) return null;

    return this.mapTemplate(template);
  }

  async createSupportPlan(data: CreateSupportPlanData): Promise<SupportPlanEntity> {
    const plan = await this.prisma.supportPlan.create({
      data: {
        tenantId: data.tenantId,
        foreignWorkerId: data.foreignWorkerId,
        templateId: data.templateId,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: data.createdBy,
        status: data.status,
        items: {
          create: data.items.map((item) => ({
            itemNumber: item.itemNumber,
            type: item.type,
            title: item.title,
            description: item.description,
            method: item.method,
            status: item.status,
          })),
        },
      },
      include: {
        items: { orderBy: { itemNumber: 'asc' } },
      },
    });

    // Create tasks linked to plan items
    const createdTasks: SupportTaskEntity[] = [];
    for (let i = 0; i < data.tasks.length; i++) {
      const taskData = data.tasks[i];
      const planItem = plan.items[i];

      const task = await this.prisma.supportTask.create({
        data: {
          tenantId: taskData.tenantId,
          supportPlanId: plan.id,
          planItemId: planItem?.id ?? null,
          foreignWorkerId: taskData.foreignWorkerId,
          assigneeId: taskData.assigneeId,
          createdById: taskData.createdById,
          type: taskData.type,
          title: taskData.title,
          description: taskData.description,
          dueDate: taskData.dueDate,
          method: taskData.method,
          status: taskData.status,
          priority: taskData.priority,
          consentRequired: taskData.consentRequired,
        },
        include: { evidence: true },
      });

      createdTasks.push(this.mapTask(task));
    }

    return this.mapPlan({ ...plan, tasks: createdTasks });
  }

  async findSupportPlanById(id: string, tenantId: string): Promise<SupportPlanEntity | null> {
    const plan = await this.prisma.supportPlan.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { itemNumber: 'asc' } },
        tasks: { include: { evidence: true } },
      },
    });

    if (!plan) return null;

    return this.mapPlan(plan);
  }

  async findSupportPlanByForeignWorkerId(
    foreignWorkerId: string,
    tenantId: string
  ): Promise<SupportPlanEntity | null> {
    const plan = await this.prisma.supportPlan.findFirst({
      where: { foreignWorkerId, tenantId },
      include: {
        items: { orderBy: { itemNumber: 'asc' } },
        tasks: { include: { evidence: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) return null;

    return this.mapPlan(plan);
  }

  async createSupportTask(data: CreateSupportTaskData): Promise<SupportTaskEntity> {
    const task = await this.prisma.supportTask.create({
      data: {
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
        method: data.method,
        status: data.status,
        priority: data.priority,
        consentRequired: data.consentRequired,
      },
      include: { evidence: true },
    });

    return this.mapTask(task);
  }

  async findTaskById(id: string, tenantId: string): Promise<SupportTaskEntity | null> {
    const task = await this.prisma.supportTask.findFirst({
      where: { id, tenantId },
      include: { evidence: true },
    });

    if (!task) return null;

    return this.mapTask(task);
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    completedAt?: Date | null
  ): Promise<SupportTaskEntity> {
    const task = await this.prisma.supportTask.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
      include: { evidence: true },
    });

    return this.mapTask(task);
  }

  async createEvidence(data: CreateEvidenceData): Promise<EvidenceEntity> {
    const evidence = await this.prisma.evidence.create({
      data: {
        tenantId: data.tenantId,
        supportTaskId: data.supportTaskId,
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
      },
    });

    return this.mapEvidence(evidence);
  }

  async findEvidenceByTaskId(taskId: string): Promise<EvidenceEntity[]> {
    const evidence = await this.prisma.evidence.findMany({
      where: { supportTaskId: taskId },
      orderBy: { createdAt: 'desc' },
    });

    return evidence.map((e) => this.mapEvidence(e));
  }

  async findForeignWorkerById(
    id: string,
    tenantId: string
  ): Promise<ForeignWorkerEntity | null> {
    const worker = await this.prisma.foreignWorker.findFirst({
      where: { id, tenantId },
    });

    if (!worker) return null;

    return {
      id: worker.id,
      tenantId: worker.tenantId,
      companyId: worker.companyId,
      firstName: worker.firstName,
      lastName: worker.lastName,
      nativeLanguage: worker.nativeLanguage,
    };
  }

  // ==================== Mapping Helpers ====================

  private mapTemplate(template: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    language: string;
    isDefault: boolean;
    isActive: boolean;
    status: string;
    version: number;
    items: Array<{
      id: string;
      templateId: string;
      itemNumber: number;
      type: string;
      title: string;
      titleTranslations: unknown;
      description: string;
      descriptionTranslations: unknown;
      defaultMethod: string | null;
      defaultDueDays: number | null;
      requiredDocuments: string[];
      requiresConsent: boolean;
      frequency: string | null;
    }>;
  }): SupportPlanTemplateEntity {
    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description,
      language: template.language,
      isDefault: template.isDefault,
      isActive: template.isActive,
      status: template.status,
      version: template.version,
      items: template.items.map((item) => ({
        id: item.id,
        templateId: item.templateId,
        itemNumber: item.itemNumber,
        type: item.type as SupportTaskType,
        title: item.title,
        titleTranslations: item.titleTranslations as Record<string, string>,
        description: item.description,
        descriptionTranslations: item.descriptionTranslations as Record<string, string>,
        defaultMethod: item.defaultMethod,
        defaultDueDays: item.defaultDueDays,
        requiredDocuments: item.requiredDocuments,
        requiresConsent: item.requiresConsent,
        frequency: item.frequency,
      })),
    };
  }

  private mapPlan(plan: {
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
    items: Array<{
      id: string;
      planId: string;
      itemNumber: number;
      type: string;
      title: string;
      description: string;
      method: string | null;
      customNotes: string | null;
      status: string;
    }>;
    tasks: SupportTaskEntity[];
  }): SupportPlanEntity {
    return {
      id: plan.id,
      tenantId: plan.tenantId,
      foreignWorkerId: plan.foreignWorkerId,
      templateId: plan.templateId,
      status: plan.status,
      startDate: plan.startDate,
      endDate: plan.endDate,
      createdBy: plan.createdBy,
      approvedBy: plan.approvedBy,
      approvedAt: plan.approvedAt,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      items: plan.items.map((item) => ({
        id: item.id,
        planId: item.planId,
        itemNumber: item.itemNumber,
        type: item.type as SupportTaskType,
        title: item.title,
        description: item.description,
        method: item.method,
        customNotes: item.customNotes,
        status: item.status,
      })),
      tasks: plan.tasks,
    };
  }

  private mapTask(task: {
    id: string;
    tenantId: string;
    supportPlanId: string;
    planItemId: string | null;
    foreignWorkerId: string;
    assigneeId: string | null;
    createdById: string;
    type: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    completedAt: Date | null;
    method: string | null;
    status: string;
    priority: string;
    consentRequired: boolean;
    consentObtainedAt: Date | null;
    consentMethod: string | null;
    createdAt: Date;
    updatedAt: Date;
    evidence: Array<{
      id: string;
      tenantId: string;
      supportTaskId: string | null;
      interviewId: string | null;
      consultationId: string | null;
      documentId: string | null;
      kind: string;
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
    }>;
  }): SupportTaskEntity {
    return {
      id: task.id,
      tenantId: task.tenantId,
      supportPlanId: task.supportPlanId,
      planItemId: task.planItemId,
      foreignWorkerId: task.foreignWorkerId,
      assigneeId: task.assigneeId,
      createdById: task.createdById,
      type: task.type as SupportTaskType,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      method: task.method,
      status: task.status as TaskStatus,
      priority: task.priority,
      consentRequired: task.consentRequired,
      consentObtainedAt: task.consentObtainedAt,
      consentMethod: task.consentMethod,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      evidence: task.evidence.map((e) => this.mapEvidence(e)),
    };
  }

  private mapEvidence(evidence: {
    id: string;
    tenantId: string;
    supportTaskId: string | null;
    interviewId: string | null;
    consultationId: string | null;
    documentId: string | null;
    kind: string;
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
  }): EvidenceEntity {
    return {
      id: evidence.id,
      tenantId: evidence.tenantId,
      supportTaskId: evidence.supportTaskId,
      interviewId: evidence.interviewId,
      consultationId: evidence.consultationId,
      documentId: evidence.documentId,
      kind: evidence.kind as 'file' | 'note' | 'url',
      note: evidence.note,
      fileKey: evidence.fileKey,
      originalFilename: evidence.originalFilename,
      mimeType: evidence.mimeType,
      fileSize: evidence.fileSize,
      fileUrl: evidence.fileUrl,
      url: evidence.url,
      description: evidence.description,
      category: evidence.category,
      createdByUserId: evidence.createdByUserId,
      createdAt: evidence.createdAt,
    };
  }
}
