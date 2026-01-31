import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createInterviewSchema = z.object({
  workerId: z.string(),
  scheduledDate: z.string().transform((s) => new Date(s)),
  scheduledTime: z.string().optional(),
  location: z.string().optional(),
  locationType: z.enum(['in_person', 'video', 'phone']).default('in_person'),
  timezone: z.string().default('Asia/Tokyo'),
  interviewerId: z.string(),
  interpreterId: z.string().optional(),
});

const recordInterviewSchema = z.object({
  actualDate: z.string().transform((s) => new Date(s)),
  actualTime: z.string().optional(),
  duration: z.number().optional(),
  conductedLanguage: z.string(),
  summary: z.string(),
  topics: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      content: z.string(),
      workerResponse: z.string().optional(),
    })
  ),
  issues: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        status: z.enum(['open', 'in_progress', 'resolved', 'escalated']).default('open'),
      })
    )
    .optional(),
  followUpRequired: z.boolean().default(false),
  followUpNotes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export async function interviewRoutes(fastify: FastifyInstance) {
  // List interviews
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('interview:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        workerId?: string;
        status?: string;
        from?: string;
        to?: string;
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
      if (query.from || query.to) {
        where.scheduledDate = {};
        if (query.from) {
          (where.scheduledDate as Record<string, unknown>).gte = new Date(query.from);
        }
        if (query.to) {
          (where.scheduledDate as Record<string, unknown>).lte = new Date(query.to);
        }
      }

      const [interviews, total] = await Promise.all([
        prisma.interview.findMany({
          where,
          include: {
            worker: {
              select: { id: true, firstName: true, lastName: true, nationality: true },
            },
            interviewer: { select: { id: true, name: true } },
            interpreter: { select: { id: true, name: true } },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { scheduledDate: 'desc' },
        }),
        prisma.interview.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: interviews,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get interview by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('interview:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const interview = await prisma.interview.findFirst({
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
          interviewer: { select: { id: true, name: true } },
          interpreter: { select: { id: true, name: true } },
          topics: true,
          issues: true,
        },
      });

      if (!interview) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Interview not found');
      }

      return {
        success: true,
        data: interview,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create interview
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('interview:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createInterviewSchema.parse(request.body);

      // Verify worker belongs to tenant
      const worker = await prisma.worker.findFirst({
        where: { id: body.workerId, tenantId },
      });

      if (!worker) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      const interview = await prisma.interview.create({
        data: {
          tenantId,
          ...body,
          createdBy: request.user.userId,
        },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true } },
          interviewer: { select: { id: true, name: true } },
        },
      });

      await auditSuccess(request, 'create', 'interview', interview.id, {
        after: { workerId: body.workerId, scheduledDate: body.scheduledDate },
      });

      return {
        success: true,
        data: interview,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Record interview results
  fastify.post<{ Params: { id: string } }>(
    '/:id/record',
    { preHandler: [authenticate, requirePermission('interview:record')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = recordInterviewSchema.parse(request.body);

      const interview = await prisma.interview.findFirst({
        where: { id, tenantId },
      });

      if (!interview) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Interview not found');
      }

      if (interview.status === 'completed') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Interview already recorded');
      }

      const updated = await prisma.interview.update({
        where: { id },
        data: {
          actualDate: body.actualDate,
          actualTime: body.actualTime,
          duration: body.duration,
          conductedLanguage: body.conductedLanguage,
          summary: body.summary,
          followUpRequired: body.followUpRequired,
          followUpNotes: body.followUpNotes,
          attachments: body.attachments ?? [],
          status: 'completed',
          topics: {
            deleteMany: {},
            create: body.topics,
          },
          issues: body.issues
            ? {
                deleteMany: {},
                create: body.issues,
              }
            : undefined,
        },
        include: {
          topics: true,
          issues: true,
        },
      });

      await auditSuccess(request, 'update', 'interview', id, {
        metadata: { action: 'record' },
      });

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get upcoming interviews (dashboard)
  fastify.get(
    '/upcoming',
    { preHandler: [authenticate, requirePermission('interview:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const query = request.query as { days?: string };
      const days = parseInt(query.days ?? '30', 10);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const interviews = await prisma.interview.findMany({
        where: {
          tenantId,
          status: { in: ['scheduled', 'confirmed'] },
          scheduledDate: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true } },
          interviewer: { select: { id: true, name: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 20,
      });

      return {
        success: true,
        data: interviews,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get overdue interviews (workers who haven't had interview in 3 months)
  fastify.get(
    '/overdue',
    { preHandler: [authenticate, requirePermission('interview:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Find workers with no completed interview in last 3 months
      const workers = await prisma.worker.findMany({
        where: {
          tenantId,
          status: 'active',
          interviews: {
            none: {
              status: 'completed',
              actualDate: { gte: threeMonthsAgo },
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationality: true,
          company: { select: { id: true, name: true } },
          interviews: {
            where: { status: 'completed' },
            orderBy: { actualDate: 'desc' },
            take: 1,
            select: { actualDate: true },
          },
        },
      });

      return {
        success: true,
        data: workers.map((w) => ({
          ...w,
          lastInterviewDate: w.interviews[0]?.actualDate ?? null,
          interviews: undefined,
        })),
        requestId: crypto.randomUUID(),
      };
    }
  );
}
