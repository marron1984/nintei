/**
 * SupportTasks Routes (Vertical Slice API)
 *
 * POST:
 * 1. POST /support-plans - テンプレートから支援計画を作成
 * 2. POST /support-tasks/:id/complete - タスクを完了にする
 * 3. POST /support-tasks/:id/evidences - エビデンスを追加
 *
 * GET:
 * 4. GET /workers/:workerId/support-plan - 外国人の支援計画を取得
 * 5. GET /support-plans/:planId/tasks - 支援計画のタスク一覧を取得
 * 6. GET /support-tasks/:taskId/evidences - タスクのエビデンス一覧を取得
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';
import { SupportPlanUseCase } from '../domain/support-plan.usecase.js';
import { PrismaSupportPlanRepository } from '../domain/support-plan.repository.prisma.js';
import { EVIDENCE_KINDS, type EvidenceKind } from '../domain/support-task.types.js';

// ==================== Schemas ====================

const createSupportPlanSchema = z.object({
  foreignWorkerId: z.string().min(1),
  templateId: z.string().optional(),
  startDate: z.string().transform((s) => new Date(s)),
});

const addEvidenceSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  note: z.string().optional(),
  fileKey: z.string().optional(),
  originalFilename: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  fileUrl: z.string().optional(),
  url: z.string().url().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

// ==================== Routes ====================

export async function supportTaskRoutes(fastify: FastifyInstance) {
  // Initialize UseCase with Prisma repository
  const repository = new PrismaSupportPlanRepository(prisma);
  const useCase = new SupportPlanUseCase(repository);

  /**
   * POST /api/v2/support-plans
   * テンプレートから支援計画を作成
   */
  fastify.post(
    '/support-plans',
    { preHandler: [authenticate, requirePermission('support_plan:create')] },
    async (request, reply) => {
      const tenantId = requireTenant(request);
      const body = createSupportPlanSchema.parse(request.body);

      const result = await useCase.createSupportPlanFromTemplate({
        tenantId,
        foreignWorkerId: body.foreignWorkerId,
        templateId: body.templateId,
        startDate: body.startDate,
        createdById: request.user.userId,
      });

      await auditSuccess(request, 'create', 'support_plan', result.supportPlan.id, {
        after: {
          foreignWorkerId: body.foreignWorkerId,
          templateId: body.templateId,
          tasksCreated: result.tasksCreated,
        },
      });

      reply.status(201);
      return {
        success: true,
        data: {
          supportPlan: result.supportPlan,
          tasksCreated: result.tasksCreated,
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  /**
   * POST /api/v2/support-tasks/:id/complete
   * タスクを完了にする
   */
  fastify.post<{ Params: { id: string } }>(
    '/support-tasks/:id/complete',
    { preHandler: [authenticate, requirePermission('task:complete')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id: taskId } = request.params;

      const result = await useCase.completeSupportTask({
        tenantId,
        taskId,
      });

      await auditSuccess(request, 'update', 'support_task', taskId, {
        metadata: { action: 'complete' },
      });

      return {
        success: true,
        data: result.task,
        requestId: crypto.randomUUID(),
      };
    }
  );

  /**
   * POST /api/v2/support-tasks/:id/evidences
   * タスクにエビデンスを追加
   */
  fastify.post<{ Params: { id: string } }>(
    '/support-tasks/:id/evidences',
    { preHandler: [authenticate, requirePermission('task:update')] },
    async (request, reply) => {
      const tenantId = requireTenant(request);
      const { id: taskId } = request.params;
      const body = addEvidenceSchema.parse(request.body);

      const result = await useCase.addEvidenceToTask({
        tenantId,
        taskId,
        kind: body.kind as EvidenceKind,
        note: body.note,
        fileKey: body.fileKey,
        originalFilename: body.originalFilename,
        mimeType: body.mimeType,
        fileSize: body.fileSize,
        fileUrl: body.fileUrl,
        url: body.url,
        description: body.description,
        category: body.category,
        createdByUserId: request.user.userId,
      });

      await auditSuccess(request, 'create', 'evidence', result.evidence.id, {
        after: {
          taskId,
          kind: body.kind,
        },
      });

      reply.status(201);
      return {
        success: true,
        data: {
          evidence: result.evidence,
          task: result.task,
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  /**
   * GET /api/v2/support-tasks/:id
   * タスク詳細取得
   */
  fastify.get<{ Params: { id: string } }>(
    '/support-tasks/:id',
    { preHandler: [authenticate, requirePermission('task:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id: taskId } = request.params;

      const task = await prisma.supportTask.findFirst({
        where: { id: taskId, tenantId },
        include: {
          evidence: {
            orderBy: { createdAt: 'desc' },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
          foreignWorker: {
            select: { id: true, firstName: true, lastName: true },
          },
          supportPlan: {
            select: { id: true, status: true },
          },
        },
      });

      if (!task) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
      }

      return {
        success: true,
        data: task,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // ==================== GET Endpoints ====================

  /**
   * GET /api/v2/workers/:workerId/support-plan
   * 外国人の支援計画を取得（アクティブなものを返す、無ければnull）
   */
  fastify.get<{ Params: { workerId: string } }>(
    '/workers/:workerId/support-plan',
    { preHandler: [authenticate, requirePermission('support_plan:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { workerId } = request.params;

      const result = await useCase.getSupportPlanByWorkerId({
        tenantId,
        foreignWorkerId: workerId,
      });

      return {
        success: true,
        data: {
          supportPlan: result.supportPlan,
          progress: result.progress,
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  /**
   * GET /api/v2/support-plans/:planId/tasks
   * 支援計画のタスク一覧を取得
   */
  fastify.get<{ Params: { planId: string } }>(
    '/support-plans/:planId/tasks',
    { preHandler: [authenticate, requirePermission('task:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { planId } = request.params;

      const result = await useCase.getTasksByPlanId({
        tenantId,
        planId,
      });

      // タスクにevidencesCountを追加
      const tasksWithCount = result.tasks.map((task) => ({
        id: task.id,
        type: task.type,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assigneeId: task.assigneeId,
        evidencesCount: task.evidence.length,
      }));

      return {
        success: true,
        data: { tasks: tasksWithCount },
        requestId: crypto.randomUUID(),
      };
    }
  );

  /**
   * GET /api/v2/support-tasks/:taskId/evidences
   * タスクのエビデンス一覧を取得
   */
  fastify.get<{ Params: { taskId: string } }>(
    '/support-tasks/:taskId/evidences',
    { preHandler: [authenticate, requirePermission('task:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { taskId } = request.params;

      const result = await useCase.getEvidencesByTaskId({
        tenantId,
        taskId,
      });

      // 必要なフィールドのみ返す
      const evidences = result.evidences.map((e) => ({
        id: e.id,
        kind: e.kind,
        note: e.note,
        fileKey: e.fileKey,
        originalFilename: e.originalFilename,
        url: e.url,
        description: e.description,
        createdAt: e.createdAt,
        createdByUserId: e.createdByUserId,
      }));

      return {
        success: true,
        data: { evidences },
        requestId: crypto.randomUUID(),
      };
    }
  );
}
