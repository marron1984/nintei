/**
 * 支援計画ユースケース層
 * 重要ドメインロジックをルートから分離し、テスト可能性を向上
 */

import type { PrismaClient, SupportPlan, SupportPlanItem, SupportTask } from '@prisma/client';
import { ApplicationError } from '@nintei/shared';

export interface CreateSupportPlanInput {
  tenantId: string;
  foreignWorkerId: string;
  templateId?: string;
  startDate: Date;
  endDate?: Date;
  createdById: string;
}

export interface CreateSupportTaskInput {
  planItemId: string;
  foreignWorkerId: string;
  assigneeId: string;
  createdById: string;
  title: string;
  description?: string;
  dueDate: Date;
  method?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  consentRequired?: boolean;
}

export interface ApproveSupportPlanInput {
  planId: string;
  tenantId: string;
  approverId: string;
}

export interface RecordConsentInput {
  taskId: string;
  tenantId: string;
  userId: string;
  method: 'written' | 'electronic' | 'verbal';
  evidenceUrl?: string;
}

// デフォルトの支援計画10項目
const DEFAULT_SUPPORT_ITEMS = [
  { itemNumber: 1, category: 'pre_entry', title: '事前ガイダンス', description: '事前ガイダンスの実施' },
  { itemNumber: 2, category: 'arrival', title: '出入国時の送迎', description: '空港等への送迎' },
  { itemNumber: 3, category: 'living', title: '住居確保・生活必需品', description: '住居の確保と生活必需品の準備' },
  { itemNumber: 4, category: 'living', title: '生活オリエンテーション', description: '生活に必要な情報の提供' },
  { itemNumber: 5, category: 'living', title: '公的手続への同行', description: '市区町村等への届出への同行' },
  { itemNumber: 6, category: 'japanese_learning', title: '日本語学習機会の提供', description: '日本語学習の機会の提供' },
  { itemNumber: 7, category: 'consultation', title: '相談・苦情対応', description: '相談・苦情への対応' },
  { itemNumber: 8, category: 'community', title: '日本人との交流促進', description: '地域住民との交流の機会の提供' },
  { itemNumber: 9, category: 'career', title: '転職支援', description: '転職支援（会社都合離職の場合）' },
  { itemNumber: 10, category: 'regular_interview', title: '定期面談', description: '定期的な面談の実施' },
];

export class SupportPlanUseCase {
  constructor(private prisma: PrismaClient) {}

  /**
   * 支援計画を作成する
   */
  async createSupportPlan(input: CreateSupportPlanInput): Promise<SupportPlan> {
    const { tenantId, foreignWorkerId, templateId, startDate, endDate, createdById } = input;

    // 外国人の存在確認
    const worker = await this.prisma.foreignWorker.findFirst({
      where: { id: foreignWorkerId, tenantId },
    });

    if (!worker) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Foreign worker not found');
    }

    // テンプレートからアイテムを取得（指定がない場合はデフォルト）
    let items = DEFAULT_SUPPORT_ITEMS;

    if (templateId) {
      const template = await this.prisma.supportPlanTemplate.findFirst({
        where: { id: templateId, tenantId, status: 'active' },
        include: { items: { orderBy: { itemNumber: 'asc' } } },
      });

      if (!template) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Template not found or not active');
      }

      items = template.items.map((item) => ({
        itemNumber: item.itemNumber,
        category: item.category,
        title: item.title,
        description: item.description,
        method: item.defaultMethod ?? undefined,
      }));
    }

    // 支援計画を作成
    const plan = await this.prisma.supportPlan.create({
      data: {
        tenantId,
        foreignWorkerId,
        templateId,
        startDate,
        endDate,
        createdBy: createdById,
        status: 'draft',
        items: {
          create: items.map((item) => ({
            itemNumber: item.itemNumber,
            category: item.category,
            title: item.title,
            description: item.description,
            method: item.method,
          })),
        },
      },
      include: {
        items: { orderBy: { itemNumber: 'asc' } },
        foreignWorker: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return plan;
  }

  /**
   * 支援計画を承認する
   * 入力と承認を分離（作成者は承認不可）
   */
  async approveSupportPlan(input: ApproveSupportPlanInput): Promise<SupportPlan> {
    const { planId, tenantId, approverId } = input;

    const plan = await this.prisma.supportPlan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
    }

    if (plan.status !== 'pending_approval') {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Plan is not pending approval');
    }

    // 入力と承認の分離チェック
    if (plan.createdBy === approverId) {
      throw new ApplicationError(
        'AUTH_PERMISSION_DENIED',
        'Cannot approve your own support plan (separation of duties)'
      );
    }

    const updated = await this.prisma.supportPlan.update({
      where: { id: planId },
      data: {
        status: 'active',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 支援計画を承認待ちに変更する
   */
  async submitForApproval(planId: string, tenantId: string): Promise<SupportPlan> {
    const plan = await this.prisma.supportPlan.findFirst({
      where: { id: planId, tenantId },
      include: { items: true },
    });

    if (!plan) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
    }

    if (plan.status !== 'draft') {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Only draft plans can be submitted');
    }

    // 10項目すべてあるか確認
    if (plan.items.length !== 10) {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Support plan must have all 10 items');
    }

    const updated = await this.prisma.supportPlan.update({
      where: { id: planId },
      data: { status: 'pending_approval' },
    });

    return updated;
  }

  /**
   * タスクを作成する
   */
  async createTask(input: CreateSupportTaskInput): Promise<SupportTask> {
    const { planItemId, foreignWorkerId, assigneeId, createdById, title, description, dueDate, method, priority, consentRequired } = input;

    // プランアイテムの存在確認
    const planItem = await this.prisma.supportPlanItem.findUnique({
      where: { id: planItemId },
      include: { plan: true },
    });

    if (!planItem) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Plan item not found');
    }

    const task = await this.prisma.supportTask.create({
      data: {
        planItemId,
        foreignWorkerId,
        assigneeId,
        createdById,
        title,
        description,
        dueDate,
        method,
        priority: priority ?? 'medium',
        consentRequired: consentRequired ?? false,
      },
    });

    // プランアイテムのステータスを更新
    await this.prisma.supportPlanItem.update({
      where: { id: planItemId },
      data: { status: 'in_progress' },
    });

    return task;
  }

  /**
   * タスクを完了する
   */
  async completeTask(taskId: string, tenantId: string): Promise<SupportTask> {
    const task = await this.prisma.supportTask.findUnique({
      where: { id: taskId },
      include: { planItem: { include: { plan: true } } },
    });

    if (!task) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
    }

    if (task.planItem.plan.tenantId !== tenantId) {
      throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Access denied');
    }

    // 同意が必要なタスクの場合、同意が取得されているか確認
    if (task.consentRequired && !task.consentObtainedAt) {
      throw new ApplicationError(
        'BUSINESS_APPROVAL_REQUIRED',
        'Consent must be obtained before completing this task'
      );
    }

    const updated = await this.prisma.supportTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // プランアイテムの完了チェック
    await this.checkAndUpdatePlanItemStatus(task.planItemId);

    return updated;
  }

  /**
   * 同意を記録する
   */
  async recordConsent(input: RecordConsentInput): Promise<SupportTask> {
    const { taskId, tenantId, method, evidenceUrl } = input;

    const task = await this.prisma.supportTask.findUnique({
      where: { id: taskId },
      include: { planItem: { include: { plan: true } } },
    });

    if (!task) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
    }

    if (task.planItem.plan.tenantId !== tenantId) {
      throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Access denied');
    }

    if (!task.consentRequired) {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'This task does not require consent');
    }

    const updated = await this.prisma.supportTask.update({
      where: { id: taskId },
      data: {
        consentObtainedAt: new Date(),
        consentMethod: method,
      },
    });

    // 証跡がある場合は添付
    if (evidenceUrl) {
      await this.prisma.evidence.create({
        data: {
          taskId,
          fileName: 'consent-evidence',
          fileType: 'document',
          mimeType: 'application/pdf',
          fileSize: 0,
          fileUrl: evidenceUrl,
          category: 'consent',
          uploadedById: input.userId,
        },
      });
    }

    return updated;
  }

  /**
   * プランアイテムのステータスを確認・更新
   */
  private async checkAndUpdatePlanItemStatus(planItemId: string): Promise<void> {
    const planItem = await this.prisma.supportPlanItem.findUnique({
      where: { id: planItemId },
      include: { tasks: true },
    });

    if (!planItem) return;

    const allCompleted = planItem.tasks.every((task) => task.status === 'completed');
    const hasCompletedTasks = planItem.tasks.some((task) => task.status === 'completed');

    let newStatus = planItem.status;
    if (allCompleted && planItem.tasks.length > 0) {
      newStatus = 'completed';
    } else if (hasCompletedTasks) {
      newStatus = 'in_progress';
    }

    if (newStatus !== planItem.status) {
      await this.prisma.supportPlanItem.update({
        where: { id: planItemId },
        data: { status: newStatus },
      });
    }
  }

  /**
   * 支援計画の進捗を取得
   */
  async getPlanProgress(planId: string, tenantId: string): Promise<{
    totalItems: number;
    completedItems: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    progress: number;
  }> {
    const plan = await this.prisma.supportPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        items: {
          include: { tasks: true },
        },
      },
    });

    if (!plan) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
    }

    const now = new Date();
    const totalItems = plan.items.length;
    const completedItems = plan.items.filter((item) => item.status === 'completed').length;
    const allTasks = plan.items.flatMap((item) => item.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((task) => task.status === 'completed').length;
    const overdueTasks = allTasks.filter(
      (task) => task.status !== 'completed' && new Date(task.dueDate) < now
    ).length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalItems,
      completedItems,
      totalTasks,
      completedTasks,
      overdueTasks,
      progress,
    };
  }
}
