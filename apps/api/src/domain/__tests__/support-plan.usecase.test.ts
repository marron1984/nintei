/**
 * SupportPlanUseCase Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SupportPlanUseCase } from '../support-plan.usecase.js';
import { InMemorySupportPlanRepository } from '../support-plan.repository.inmemory.js';
import type { SupportPlanTemplateEntity, ForeignWorkerEntity } from '../support-plan.repository.js';
import type { SupportTaskType } from '../support-task.types.js';

describe('SupportPlanUseCase', () => {
  let repository: InMemorySupportPlanRepository;
  let useCase: SupportPlanUseCase;

  const tenantId = 'tenant_001';
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
    items: [
      {
        id: 'item_001',
        templateId: 'template_001',
        itemNumber: 1,
        type: 'pre_entry_guidance' as SupportTaskType,
        title: '事前ガイダンス',
        titleTranslations: { en: 'Pre-entry Guidance', vi: 'Hướng dẫn trước khi nhập cảnh' },
        description: '入国前に必要な情報を提供',
        descriptionTranslations: {},
        defaultMethod: 'video_call',
        defaultDueDays: -7,
        requiredDocuments: ['passport', 'coe'],
        requiresConsent: true,
        frequency: 'once',
      },
      {
        id: 'item_002',
        templateId: 'template_001',
        itemNumber: 2,
        type: 'airport_pickup' as SupportTaskType,
        title: '空港送迎',
        titleTranslations: { en: 'Airport Pickup' },
        description: '入国時の空港送迎',
        descriptionTranslations: {},
        defaultMethod: 'in_person',
        defaultDueDays: 0,
        requiredDocuments: [],
        requiresConsent: false,
        frequency: 'once',
      },
      {
        id: 'item_003',
        templateId: 'template_001',
        itemNumber: 3,
        type: 'housing_support' as SupportTaskType,
        title: '住居確保支援',
        titleTranslations: { en: 'Housing Support' },
        description: '住居の確保と生活契約の支援',
        descriptionTranslations: {},
        defaultMethod: 'in_person',
        defaultDueDays: 7,
        requiredDocuments: [],
        requiresConsent: false,
        frequency: 'once',
      },
    ],
  };

  beforeEach(() => {
    repository = new InMemorySupportPlanRepository();
    useCase = new SupportPlanUseCase(repository);
    repository.addForeignWorker(mockForeignWorker);
    repository.addTemplate(mockTemplate);
  });

  describe('createSupportPlanFromTemplate', () => {
    it('テンプレートから支援計画を作成できる', async () => {
      const startDate = new Date('2024-04-01');

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate,
        createdById: userId,
      });

      expect(result.supportPlan).toBeDefined();
      expect(result.supportPlan.tenantId).toBe(tenantId);
      expect(result.supportPlan.foreignWorkerId).toBe(foreignWorkerId);
      expect(result.supportPlan.templateId).toBe(mockTemplate.id);
      expect(result.supportPlan.status).toBe('draft');
      expect(result.supportPlan.items).toHaveLength(3);
      expect(result.tasksCreated).toBe(3);
    });

    it('タスクのdueDateがdefaultDueDaysから正しく計算される', async () => {
      const startDate = new Date('2024-04-01');

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate,
        createdById: userId,
      });

      const tasks = result.supportPlan.tasks;

      // 事前ガイダンス: startDate - 7日 = 2024-03-25
      expect(tasks[0].dueDate).toEqual(new Date('2024-03-25'));

      // 空港送迎: startDate + 0日 = 2024-04-01
      expect(tasks[1].dueDate).toEqual(new Date('2024-04-01'));

      // 住居確保: startDate + 7日 = 2024-04-08
      expect(tasks[2].dueDate).toEqual(new Date('2024-04-08'));
    });

    it('存在しない外国人IDでエラーになる', async () => {
      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId,
          foreignWorkerId: 'non_existent',
          templateId: mockTemplate.id,
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Foreign worker not found');
    });

    it('存在しないテンプレートIDでエラーになる', async () => {
      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId,
          foreignWorkerId,
          templateId: 'non_existent',
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Support plan template not found');
    });

    it('非アクティブなテンプレートでエラーになる', async () => {
      const inactiveTemplate = { ...mockTemplate, id: 'template_inactive', isActive: false };
      repository.addTemplate(inactiveTemplate);

      await expect(
        useCase.createSupportPlanFromTemplate({
          tenantId,
          foreignWorkerId,
          templateId: 'template_inactive',
          startDate: new Date(),
          createdById: userId,
        })
      ).rejects.toThrow('Template is not active');
    });

    it('テンプレートID未指定時、アクティブなテンプレートが自動選択される', async () => {
      const startDate = new Date('2024-04-01');

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        startDate,
        createdById: userId,
      });

      expect(result.supportPlan.templateId).toBe(mockTemplate.id);
    });
  });

  describe('completeSupportTask', () => {
    it('タスクを完了にできる', async () => {
      // まず支援計画を作成
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      const result = await useCase.completeSupportTask({
        tenantId,
        taskId,
      });

      expect(result.task.status).toBe('done');
      expect(result.task.completedAt).toBeInstanceOf(Date);
    });

    it('存在しないタスクIDでエラーになる', async () => {
      await expect(
        useCase.completeSupportTask({
          tenantId,
          taskId: 'non_existent',
        })
      ).rejects.toThrow('Task not found');
    });

    it('既に完了済みのタスクでエラーになる', async () => {
      // 支援計画を作成してタスクを完了
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await useCase.completeSupportTask({ tenantId, taskId });

      // 再度完了を試みる
      await expect(
        useCase.completeSupportTask({ tenantId, taskId })
      ).rejects.toThrow('Task is already completed');
    });
  });

  describe('addEvidenceToTask', () => {
    it('ノート形式のエビデンスを追加できる', async () => {
      // 支援計画を作成
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
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
    });

    it('ファイル形式のエビデンスを追加できる', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      const result = await useCase.addEvidenceToTask({
        tenantId,
        taskId,
        kind: 'file',
        fileKey: 'uploads/2024/04/consent-form.pdf',
        originalFilename: 'consent-form.pdf',
        mimeType: 'application/pdf',
        fileSize: 102400,
        description: '同意書',
        createdByUserId: userId,
      });

      expect(result.evidence.kind).toBe('file');
      expect(result.evidence.fileKey).toBe('uploads/2024/04/consent-form.pdf');
      expect(result.evidence.originalFilename).toBe('consent-form.pdf');
    });

    it('URL形式のエビデンスを追加できる', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      const result = await useCase.addEvidenceToTask({
        tenantId,
        taskId,
        kind: 'url',
        url: 'https://example.com/meeting-recording',
        description: 'オンライン面談の録画',
        createdByUserId: userId,
      });

      expect(result.evidence.kind).toBe('url');
      expect(result.evidence.url).toBe('https://example.com/meeting-recording');
    });

    it('kind=noteでnoteがないとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'note',
          createdByUserId: userId,
        })
      ).rejects.toThrow('Note is required for kind=note');
    });

    it('kind=fileでfileKeyがないとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'file',
          createdByUserId: userId,
        })
      ).rejects.toThrow('File key is required for kind=file');
    });

    it('kind=urlでurlがないとエラー', async () => {
      const planResult = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId,
        templateId: mockTemplate.id,
        startDate: new Date(),
        createdById: userId,
      });

      const taskId = planResult.supportPlan.tasks[0].id;

      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId,
          kind: 'url',
          createdByUserId: userId,
        })
      ).rejects.toThrow('URL is required for kind=url');
    });

    it('存在しないタスクIDでエラー', async () => {
      await expect(
        useCase.addEvidenceToTask({
          tenantId,
          taskId: 'non_existent',
          kind: 'note',
          note: 'Test note',
          createdByUserId: userId,
        })
      ).rejects.toThrow('Task not found');
    });
  });
});
