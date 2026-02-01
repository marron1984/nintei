/**
 * SupportPlanUseCase Unit Tests
 * 14 test cases as specified
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SupportPlanUseCase } from '../support-plan.usecase.js';
import { InMemorySupportPlanRepository } from '../support-plan.repository.inmemory.js';
import type {
  SupportPlanTemplateEntity,
  ForeignWorkerEntity,
  SupportPlanItemTemplateEntity,
} from '../support-plan.repository.js';
import type { SupportTaskType } from '../support-task.types.js';

// 支援10項目のテンプレートアイテムを生成
function createTemplateItems(templateId: string): SupportPlanItemTemplateEntity[] {
  const types: Array<{ type: SupportTaskType; title: string; defaultDueDays: number | null }> = [
    { type: 'pre_entry_guidance', title: '事前ガイダンス', defaultDueDays: -7 },
    { type: 'airport_pickup', title: '出入国時の送迎', defaultDueDays: 0 },
    { type: 'housing_support', title: '住居確保・生活契約支援', defaultDueDays: 7 },
    { type: 'life_orientation', title: '生活オリエンテーション', defaultDueDays: 14 },
    { type: 'official_procedures', title: '公的手続等への同行', defaultDueDays: 14 },
    { type: 'japanese_learning', title: '日本語学習の機会の提供', defaultDueDays: 30 },
    { type: 'consultation_complaints', title: '相談・苦情への対応', defaultDueDays: 7 },
    { type: 'japanese_community', title: '日本人との交流促進', defaultDueDays: 90 },
    { type: 'job_change_support', title: '転職支援', defaultDueDays: null },
    { type: 'regular_interviews', title: '定期的な面談', defaultDueDays: 90 },
  ];

  return types.map((t, index) => ({
    id: `item_${String(index + 1).padStart(3, '0')}`,
    templateId,
    itemNumber: index + 1,
    type: t.type,
    title: t.title,
    titleTranslations: {},
    description: `${t.title}の説明`,
    descriptionTranslations: {},
    defaultMethod: 'in_person',
    defaultDueDays: t.defaultDueDays,
    requiredDocuments: [],
    requiresConsent: index === 0 || index === 3, // 事前ガイダンスと生活オリエンテーション
    frequency: 'once',
  }));
}

describe('SupportPlanUseCase', () => {
  let repository: InMemorySupportPlanRepository;
  let useCase: SupportPlanUseCase;

  const tenantId = 'tenant_001';
  const otherTenantId = 'tenant_002';
  const userId = 'user_001';
  const foreignWorkerId = 'worker_001';

  const mockForeignWorker: ForeignWorkerEntity = {
    id: foreignWorkerId,
    tenantId,
    companyId: 'company_001',
    firstName: 'Nguyen',
    lastName: 'Van A',
    nativeLanguage: 'vi',
  };

  const mockTemplate: SupportPlanTemplateEntity = {
    id: 'template_001',
    tenantId,
    name: '標準支援計画テンプレート',
    description: '特定技能外国人向け支援計画テンプレート',
    language: 'ja',
    isDefault: true,
    isActive: true,
    status: 'active',
    version: 1,
    items: createTemplateItems('template_001'),
  };

  beforeEach(() => {
    repository = new InMemorySupportPlanRepository();
    useCase = new SupportPlanUseCase(repository);
    repository.addForeignWorker(mockForeignWorker);
    repository.addTemplate(mockTemplate);
  });

  // ==================== createSupportPlanFromTemplate（6） ====================

  describe('createSupportPlanFromTemplate', () => {
    // 1) 正常: template10件 → task10件生成
    it('1. テンプレート10項目から10件のタスクを生成する', async () => {
      const startDate = new Date('2024-04-01');

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate,
        createdById: userId,
      });

      expect(result.supportPlan.items).toHaveLength(10);
      expect(result.tasksCreated).toBe(10);
      expect(result.supportPlan.tasks).toHaveLength(10);

      // タスクのtype確認
      const taskTypes = result.supportPlan.tasks.map((t) => t.type);
      expect(taskTypes).toContain('pre_entry_guidance');
      expect(taskTypes).toContain('regular_interviews');
    });

    // 2) 正常: progress初期値 done=0
    it('2. 作成直後のタスクはすべてtodoステータス（done=0）', async () => {
      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const doneCount = result.supportPlan.tasks.filter((t) => t.status === 'done').length;
      expect(doneCount).toBe(0);

      const todoCount = result.supportPlan.tasks.filter((t) => t.status === 'todo').length;
      expect(todoCount).toBe(10);
    });

    // 3) 異常: tenant不一致（templateが別tenant）→ エラー
    it('3. 別テナントのテンプレートを指定するとエラー', async () => {
      const otherTemplate: SupportPlanTemplateEntity = {
        ...mockTemplate,
        id: 'template_other',
        tenantId: otherTenantId,
      };
      repository.addTemplate(otherTemplate);

      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId, // tenant_001
          foreignWorkerId,
          templateId: 'template_other', // belongs to tenant_002
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Support plan template not found');
    });

    // 4) 異常: worker存在しない → エラー
    it('4. 存在しない外国人IDでエラー', async () => {
      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId,
          foreignWorkerId: 'non_existent_worker',
          templateId: mockTemplate.id,
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Foreign worker not found');
    });

    // 5) 異常: 既にactive planがある場合 → エラー
    it('5. 既にアクティブな支援計画がある場合はエラー', async () => {
      // 最初の支援計画を作成
      await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      // 2つ目を作成しようとするとエラー
      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId,
          foreignWorkerId,
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Foreign worker already has an active support plan');
    });

    // 6) dueDate計算: defaultDueDaysがnullの場合はnull
    it('6. defaultDueDaysからdueDateが正しく計算される（nullの場合はnull）', async () => {
      const startDate = new Date('2024-04-01');

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate,
        createdById: userId,
      });

      // pre_entry_guidance: -7日
      const task1 = result.supportPlan.tasks.find((t) => t.type === 'pre_entry_guidance');
      expect(task1?.dueDate).toEqual(new Date('2024-03-25'));

      // airport_pickup: 0日
      const task2 = result.supportPlan.tasks.find((t) => t.type === 'airport_pickup');
      expect(task2?.dueDate).toEqual(new Date('2024-04-01'));

      // job_change_support: null
      const task9 = result.supportPlan.tasks.find((t) => t.type === 'job_change_support');
      expect(task9?.dueDate).toBeNull();
    });
  });

  // ==================== completeSupportTask（4） ====================

  describe('completeSupportTask', () => {
    // 7) 正常: todo→done, completedAtセット
    it('7. タスクを完了にするとstatus=done, completedAtがセットされる', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;
      const beforeComplete = new Date();

      const result = await useCase.completeSupportTask({
        tenantId,
        taskId,
      });

      expect(result.task.status).toBe('done');
      expect(result.task.completedAt).toBeInstanceOf(Date);
      expect(result.task.completedAt!.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime());
    });

    // 8) 異常: tenant不一致 → エラー
    it('8. 別テナントのタスクを完了しようとするとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await expect(
        useCase.completeSupportTask({
          tenantId: otherTenantId, // 別テナント
          taskId,
        })
      ).rejects.toThrow('Task not found');
    });

    // 9) 異常: task存在しない → エラー
    it('9. 存在しないタスクIDでエラー', async () => {
      await expect(
        useCase.completeSupportTask({
          tenantId,
          taskId: 'non_existent_task',
        })
      ).rejects.toThrow('Task not found');
    });

    // 10) 冪等性: 2回completeするとエラー
    it('10. 既に完了済みのタスクを再度完了しようとするとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      // 1回目: 成功
      await useCase.completeSupportTask({ tenantId, taskId });

      // 2回目: エラー
      await expect(
        useCase.completeSupportTask({ tenantId, taskId })
      ).rejects.toThrow('Task is already completed');
    });
  });

  // ==================== addEvidenceToTask（4） ====================

  describe('addEvidenceToTask', () => {
    // 11) 正常: kind=note, note必須で作成
    it('11. kind=noteでエビデンスを追加できる', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      const result = await useCase.addEvidenceToTask({
        tenantId,
        taskId,
        kind: 'note',
        note: '外国人本人に説明を実施。理解確認OK。',
        createdByUserId: userId,
      });

      expect(result.evidence.kind).toBe('note');
      expect(result.evidence.note).toBe('外国人本人に説明を実施。理解確認OK。');
      expect(result.evidence.supportTaskId).toBe(taskId);
      expect(result.evidence.createdByUserId).toBe(userId);
    });

    // 12) 異常: kind=note で note無し → エラー
    it('12. kind=noteでnoteがないとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'note',
          // note is missing
          createdByUserId: userId,
        })
      ).rejects.toThrow('Note is required for kind=note');
    });

    // 13) 異常: tenant不一致 or task存在しない → エラー
    it('13. 別テナントまたは存在しないタスクでエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      // 別テナント
      await expect(
        useCase.addEvidenceToTask({
          tenantId: otherTenantId,
          taskId,
          kind: 'note',
          note: 'Test',
          createdByUserId: userId,
        })
      ).rejects.toThrow('Task not found');

      // 存在しないタスク
      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId: 'non_existent_task',
          kind: 'note',
          note: 'Test',
          createdByUserId: userId,
        })
      ).rejects.toThrow('Task not found');
    });

    // 14) kind=file, kind=urlの検証
    it('14. kind=file/urlで必須フィールドがないとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      // kind=file without fileKey
      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'file',
          createdByUserId: userId,
        })
      ).rejects.toThrow('File key is required for kind=file');

      // kind=url without url
      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'url',
          createdByUserId: userId,
        })
      ).rejects.toThrow('URL is required for kind=url');
    });
  });
});
