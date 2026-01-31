import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createPlanSchema = z.object({
  workerId: z.string(),
  templateId: z.string().optional(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
});

const createTaskSchema = z.object({
  planItemId: z.string(),
  assigneeId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().transform((s) => new Date(s)),
  method: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  consentRequired: z.boolean().default(false),
});

export async function supportPlanRoutes(fastify: FastifyInstance) {
  // List support plans
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('support_plan:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        workerId?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.workerId) {
        where.workerId = query.workerId;
      }
      if (query.status) {
        where.status = query.status;
      }

      const [plans, total] = await Promise.all([
        prisma.supportPlan.findMany({
          where,
          include: {
            worker: {
              select: { id: true, firstName: true, lastName: true, nationality: true },
            },
            template: {
              select: { id: true, name: true },
            },
            creator: {
              select: { id: true, name: true },
            },
            _count: {
              select: { items: true },
            },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.supportPlan.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: plans,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get plan by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('support_plan:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const plan = await prisma.supportPlan.findFirst({
        where: { id, tenantId },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nationality: true,
              nativeLanguage: true,
              company: { select: { id: true, name: true } },
            },
          },
          template: true,
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          items: {
            include: {
              tasks: {
                include: {
                  assignee: { select: { id: true, name: true } },
                },
                orderBy: { dueDate: 'asc' },
              },
            },
            orderBy: { itemNumber: 'asc' },
          },
        },
      });

      if (!plan) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
      }

      return {
        success: true,
        data: plan,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create support plan
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('support_plan:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createPlanSchema.parse(request.body);

      // Verify worker belongs to tenant
      const worker = await prisma.worker.findFirst({
        where: { id: body.workerId, tenantId },
      });

      if (!worker) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      // Get template items if templateId provided
      let templateItems: Array<{
        itemNumber: number;
        category: string;
        title: string;
        description: string;
        defaultMethod: string | null;
      }> = [];

      if (body.templateId) {
        const template = await prisma.supportPlanTemplate.findFirst({
          where: { id: body.templateId, tenantId, status: 'active' },
          include: { items: { orderBy: { itemNumber: 'asc' } } },
        });

        if (!template) {
          throw new ApplicationError('RESOURCE_NOT_FOUND', 'Template not found');
        }

        templateItems = template.items;
      } else {
        // Default 10 items
        templateItems = [
          { itemNumber: 1, category: 'pre_entry', title: '事前ガイダンス', description: '事前ガイダンスの実施', defaultMethod: null },
          { itemNumber: 2, category: 'arrival', title: '出入国時の送迎', description: '空港等への送迎', defaultMethod: null },
          { itemNumber: 3, category: 'living', title: '住居確保・生活必需品', description: '住居の確保と生活必需品の準備', defaultMethod: null },
          { itemNumber: 4, category: 'living', title: '生活オリエンテーション', description: '生活に必要な情報の提供', defaultMethod: null },
          { itemNumber: 5, category: 'living', title: '公的手続への同行', description: '市区町村等への届出への同行', defaultMethod: null },
          { itemNumber: 6, category: 'japanese_learning', title: '日本語学習機会の提供', description: '日本語学習の機会の提供', defaultMethod: null },
          { itemNumber: 7, category: 'consultation', title: '相談・苦情対応', description: '相談・苦情への対応', defaultMethod: null },
          { itemNumber: 8, category: 'community', title: '日本人との交流促進', description: '地域住民との交流の機会の提供', defaultMethod: null },
          { itemNumber: 9, category: 'career', title: '転職支援', description: '転職支援（会社都合離職の場合）', defaultMethod: null },
          { itemNumber: 10, category: 'regular_interview', title: '定期面談', description: '定期的な面談の実施', defaultMethod: null },
        ];
      }

      const plan = await prisma.supportPlan.create({
        data: {
          tenantId,
          workerId: body.workerId,
          templateId: body.templateId,
          startDate: body.startDate,
          endDate: body.endDate,
          createdBy: request.user.userId,
          items: {
            create: templateItems.map((item) => ({
              itemNumber: item.itemNumber,
              category: item.category,
              title: item.title,
              description: item.description,
              method: item.defaultMethod,
            })),
          },
        },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true } },
          items: { orderBy: { itemNumber: 'asc' } },
        },
      });

      await auditSuccess(request, 'create', 'support_plan', plan.id, {
        after: { workerId: body.workerId, templateId: body.templateId },
      });

      return {
        success: true,
        data: plan,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Approve support plan
  fastify.post<{ Params: { id: string } }>(
    '/:id/approve',
    { preHandler: [authenticate, requirePermission('support_plan:approve')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const plan = await prisma.supportPlan.findFirst({
        where: { id, tenantId },
      });

      if (!plan) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
      }

      if (plan.status !== 'pending_approval') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Plan is not pending approval');
      }

      // Cannot approve own plan (separation of duties)
      if (plan.createdBy === request.user.userId) {
        throw new ApplicationError(
          'AUTH_PERMISSION_DENIED',
          'Cannot approve your own support plan'
        );
      }

      const updated = await prisma.supportPlan.update({
        where: { id },
        data: {
          status: 'active',
          approvedBy: request.user.userId,
          approvedAt: new Date(),
        },
      });

      await auditSuccess(request, 'approve', 'support_plan', id);

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create task for plan item
  fastify.post<{ Params: { id: string } }>(
    '/:id/tasks',
    { preHandler: [authenticate, requirePermission('task:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = createTaskSchema.parse(request.body);

      const plan = await prisma.supportPlan.findFirst({
        where: { id, tenantId },
        include: { items: true },
      });

      if (!plan) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Support plan not found');
      }

      const planItem = plan.items.find((item) => item.id === body.planItemId);
      if (!planItem) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Plan item not found');
      }

      const task = await prisma.supportTask.create({
        data: {
          planItemId: body.planItemId,
          workerId: plan.workerId,
          assigneeId: body.assigneeId,
          createdById: request.user.userId,
          title: body.title,
          description: body.description,
          dueDate: body.dueDate,
          method: body.method,
          priority: body.priority,
          consentRequired: body.consentRequired,
        },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      });

      await auditSuccess(request, 'create', 'support_task', task.id, {
        after: { title: body.title, assigneeId: body.assigneeId },
      });

      return {
        success: true,
        data: task,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Complete task
  fastify.post<{ Params: { taskId: string } }>(
    '/tasks/:taskId/complete',
    { preHandler: [authenticate, requirePermission('task:complete')] },
    async (request) => {
      const { taskId } = request.params;

      const task = await prisma.supportTask.findUnique({
        where: { id: taskId },
        include: { planItem: { include: { plan: true } } },
      });

      if (!task) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
      }

      if (task.planItem.plan.tenantId !== request.user.tenantId) {
        throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Access denied');
      }

      // Check consent if required
      if (task.consentRequired && !task.consentObtainedAt) {
        throw new ApplicationError(
          'BUSINESS_APPROVAL_REQUIRED',
          'Consent is required before completing this task'
        );
      }

      const updated = await prisma.supportTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      await auditSuccess(request, 'update', 'support_task', taskId, {
        metadata: { action: 'complete' },
      });

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Record consent
  fastify.post<{ Params: { taskId: string } }>(
    '/tasks/:taskId/consent',
    { preHandler: [authenticate, requirePermission('task:update')] },
    async (request) => {
      const { taskId } = request.params;

      const schema = z.object({
        method: z.enum(['written', 'electronic', 'verbal']),
        evidence: z.string().optional(),
      });

      const body = schema.parse(request.body);

      const task = await prisma.supportTask.findUnique({
        where: { id: taskId },
        include: { planItem: { include: { plan: true } } },
      });

      if (!task) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Task not found');
      }

      if (task.planItem.plan.tenantId !== request.user.tenantId) {
        throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Access denied');
      }

      const updated = await prisma.supportTask.update({
        where: { id: taskId },
        data: {
          consentObtainedAt: new Date(),
          consentMethod: body.method,
          consentEvidence: body.evidence,
        },
      });

      await auditSuccess(request, 'update', 'support_task', taskId, {
        metadata: { action: 'consent_recorded', method: body.method },
      });

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );
}
