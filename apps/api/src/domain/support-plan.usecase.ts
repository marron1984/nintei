/**
 * SupportPlan UseCase
 * ビジネスロジックの実装（リポジトリパターンによるインフラ層との分離）
 */

import { ApplicationError } from '@nintei/shared';
import type {
  SupportPlanRepository,
  SupportPlanEntity,
  SupportTaskEntity,
  EvidenceEntity,
  CreateSupportPlanData,
  CreateSupportTaskData,
  CreateEvidenceData,
} from './support-plan.repository.js';
import type { SupportTaskType, EvidenceKind } from './support-task.types.js';
import { isSupportTaskType, isEvidenceKind } from './support-task.types.js';

// ==================== Input Types ====================

export interface CreateSupportPlanFromTemplateInput {
  tenantId: string;
  foreignWorkerId: string;
  templateId?: string;
  startDate: Date;
  createdById: string;
}

export interface CompleteSupportTaskInput {
  tenantId: string;
  taskId: string;
}

export interface AddEvidenceToTaskInput {
  tenantId: string;
  taskId: string;
  kind: EvidenceKind;
  note?: string;
  fileKey?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  fileUrl?: string;
  url?: string;
  description?: string;
  category?: string;
  createdByUserId: string;
}

// ==================== Result Types ====================

export interface CreateSupportPlanResult {
  supportPlan: SupportPlanEntity;
  tasksCreated: number;
}

export interface CompleteSupportTaskResult {
  task: SupportTaskEntity;
}

export interface AddEvidenceResult {
  evidence: EvidenceEntity;
  task: SupportTaskEntity;
}

export interface GetSupportPlanInput {
  tenantId: string;
  foreignWorkerId: string;
}

export interface GetTasksInput {
  tenantId: string;
  planId: string;
}

export interface GetEvidencesInput {
  tenantId: string;
  taskId: string;
}

export interface SupportPlanProgress {
  total: number;
  done: number;
  percent: number;
}

export interface GetSupportPlanResult {
  supportPlan: SupportPlanEntity | null;
  progress: SupportPlanProgress | null;
}

export interface GetTasksResult {
  tasks: SupportTaskEntity[];
}

export interface GetEvidencesResult {
  evidences: EvidenceEntity[];
}

// ==================== UseCase Class ====================

export class SupportPlanUseCase {
  constructor(private readonly repository: SupportPlanRepository) {}

  /**
   * 1. テンプレートから支援計画を作成
   * - テンプレートの各項目からタスクを自動生成
   * - defaultDueDays を startDate に加算して dueDate を計算
   */
  async createSupportPlanFromTemplate(
    input: CreateSupportPlanFromTemplateInput
  ): Promise<CreateSupportPlanResult> {
    const { tenantId, foreignWorkerId, templateId, startDate, createdById } = input;

    // 外国人の存在確認
    const foreignWorker = await this.repository.findForeignWorkerById(foreignWorkerId, tenantId);
    if (!foreignWorker) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Foreign worker not found');
    }

    // テンプレート取得（指定がない場合はアクティブなデフォルトを取得）
    let template;
    if (templateId) {
      template = await this.repository.findTemplateById(templateId, tenantId);
    } else {
      template = await this.repository.findActiveTemplate(tenantId, foreignWorker.nativeLanguage);
    }

    if (!template) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan template not found');
    }

    if (!template.isActive) {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Template is not active');
    }

    // 既存の支援計画がないことを確認
    const existingPlan = await this.repository.findSupportPlanByForeignWorkerId(
      foreignWorkerId,
      tenantId
    );
    if (existingPlan && existingPlan.status !== 'archived') {
      throw new ApplicationError(
        'BUSINESS_INVALID_STATE',
        'Foreign worker already has an active support plan'
      );
    }

    // 支援計画データを構築
    const items = template.items.map((item) => ({
      itemNumber: item.itemNumber,
      type: item.type,
      title: item.title,
      description: item.description,
      method: item.defaultMethod,
      status: 'pending',
    }));

    // タスクデータを構築（プランID は後で設定）
    const tasksData = template.items.map((item) => {
      let dueDate: Date | null = null;
      if (item.defaultDueDays !== null) {
        dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + item.defaultDueDays);
      }

      return {
        tenantId,
        supportPlanId: '', // 後で設定
        planItemId: null as string | null, // 後で設定
        foreignWorkerId,
        assigneeId: null,
        createdById,
        type: item.type,
        title: item.title,
        description: item.description,
        dueDate,
        method: item.defaultMethod,
        status: 'todo' as const,
        priority: 'medium',
        consentRequired: item.requiresConsent,
      };
    });

    // 支援計画を作成
    const planData: CreateSupportPlanData = {
      tenantId,
      foreignWorkerId,
      templateId: template.id,
      startDate,
      endDate: null,
      createdBy: createdById,
      status: 'draft',
      items,
      tasks: tasksData,
    };

    const supportPlan = await this.repository.createSupportPlan(planData);

    return {
      supportPlan,
      tasksCreated: supportPlan.tasks.length,
    };
  }

  /**
   * 2. タスクを完了にする
   * - status を "done" に変更
   * - completedAt を現在時刻に設定
   */
  async completeSupportTask(input: CompleteSupportTaskInput): Promise<CompleteSupportTaskResult> {
    const { tenantId, taskId } = input;

    const task = await this.repository.findTaskById(taskId, tenantId);
    if (!task) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
    }

    if (task.status === 'done') {
      throw new ApplicationError('BUSINESS_INVALID_STATE', 'Task is already completed');
    }

    const completedAt = new Date();
    const updatedTask = await this.repository.updateTaskStatus(taskId, 'done', completedAt);

    return {
      task: updatedTask,
    };
  }

  /**
   * 3. タスクにエビデンスを追加
   * - file, note, url のいずれかを登録
   */
  async addEvidenceToTask(input: AddEvidenceToTaskInput): Promise<AddEvidenceResult> {
    const {
      tenantId,
      taskId,
      kind,
      note,
      fileKey,
      originalFilename,
      mimeType,
      fileSize,
      fileUrl,
      url,
      description,
      category,
      createdByUserId,
    } = input;

    // kind の検証
    if (!isEvidenceKind(kind)) {
      throw new ApplicationError('VALIDATION_INVALID_INPUT', 'Invalid evidence kind');
    }

    // kind に応じた必須フィールドチェック
    if (kind === 'note' && !note) {
      throw new ApplicationError('VALIDATION_INVALID_INPUT', 'Note is required for kind=note');
    }
    if (kind === 'file' && !fileKey) {
      throw new ApplicationError('VALIDATION_INVALID_INPUT', 'File key is required for kind=file');
    }
    if (kind === 'url' && !url) {
      throw new ApplicationError('VALIDATION_INVALID_INPUT', 'URL is required for kind=url');
    }

    // タスクの存在確認
    const task = await this.repository.findTaskById(taskId, tenantId);
    if (!task) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
    }

    // エビデンスを作成
    const evidenceData: CreateEvidenceData = {
      tenantId,
      supportTaskId: taskId,
      kind,
      note: note ?? null,
      fileKey: fileKey ?? null,
      originalFilename: originalFilename ?? null,
      mimeType: mimeType ?? null,
      fileSize: fileSize ?? null,
      fileUrl: fileUrl ?? null,
      url: url ?? null,
      description: description ?? null,
      category: category ?? null,
      createdByUserId,
    };

    const evidence = await this.repository.createEvidence(evidenceData);

    // 最新のタスク情報を取得
    const updatedTask = await this.repository.findTaskById(taskId, tenantId);

    return {
      evidence,
      task: updatedTask!,
    };
  }

  // ==================== GET Methods ====================

  /**
   * 4. 外国人の支援計画を取得
   * - アクティブな支援計画を返す（無ければnull）
   * - 進捗情報（total/done/percent）を含む
   */
  async getSupportPlanByWorkerId(input: GetSupportPlanInput): Promise<GetSupportPlanResult> {
    const { tenantId, foreignWorkerId } = input;

    const supportPlan = await this.repository.findSupportPlanByForeignWorkerId(
      foreignWorkerId,
      tenantId
    );

    if (!supportPlan) {
      return { supportPlan: null, progress: null };
    }

    // 進捗を計算
    const total = supportPlan.tasks.length;
    const done = supportPlan.tasks.filter((t) => t.status === 'done').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      supportPlan,
      progress: { total, done, percent },
    };
  }

  /**
   * 5. 支援計画のタスク一覧を取得
   * - itemNumber順でソート
   */
  async getTasksByPlanId(input: GetTasksInput): Promise<GetTasksResult> {
    const { tenantId, planId } = input;

    const plan = await this.repository.findSupportPlanById(planId, tenantId);
    if (!plan) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
    }

    // タスクをitemNumber順（type順）でソート
    const sortedTasks = [...plan.tasks].sort((a, b) => {
      // SupportPlanItemのitemNumberでソート
      const itemA = plan.items.find((i) => i.id === a.planItemId);
      const itemB = plan.items.find((i) => i.id === b.planItemId);
      return (itemA?.itemNumber ?? 0) - (itemB?.itemNumber ?? 0);
    });

    return { tasks: sortedTasks };
  }

  /**
   * 6. タスクのエビデンス一覧を取得
   */
  async getEvidencesByTaskId(input: GetEvidencesInput): Promise<GetEvidencesResult> {
    const { tenantId, taskId } = input;

    // タスクの存在確認（tenant境界チェック）
    const task = await this.repository.findTaskById(taskId, tenantId);
    if (!task) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
    }

    const evidences = await this.repository.findEvidenceByTaskId(taskId);

    return { evidences };
  }
}
