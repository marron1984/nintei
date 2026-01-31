import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createConsultationSchema = z.object({
  workerId: z.string(),
  companyId: z.string(),
  category: z.enum([
    'work_conditions',
    'harassment',
    'wage',
    'living',
    'health',
    'visa',
    'family',
    'other',
  ]),
  subject: z.string().min(1),
  description: z.string().min(1),
  receivedMethod: z.enum(['phone', 'email', 'in_person', 'app', 'other']),
  language: z.string(),
  interpreterId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  attachments: z.array(z.string()).optional(),
});

const respondSchema = z.object({
  content: z.string().min(1),
  language: z.string(),
  attachments: z.array(z.string()).optional(),
});

const closeSchema = z.object({
  resolution: z.string().min(1),
});

export async function consultationRoutes(fastify: FastifyInstance) {
  // List consultations
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('consultation:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        workerId?: string;
        companyId?: string;
        status?: string;
        category?: string;
        priority?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.workerId) where.workerId = query.workerId;
      if (query.companyId) where.companyId = query.companyId;
      if (query.status) where.status = query.status;
      if (query.category) where.category = query.category;
      if (query.priority) where.priority = query.priority;

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where,
          include: {
            worker: { select: { id: true, firstName: true, lastName: true } },
            company: { select: { id: true, name: true } },
            receivedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            _count: { select: { responses: true } },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.consultation.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: consultations,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get consultation by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('consultation:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const consultation = await prisma.consultation.findFirst({
        where: { id, tenantId },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nationality: true,
              nativeLanguage: true,
            },
          },
          company: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          responses: {
            include: {
              responder: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
          escalations: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!consultation) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Consultation not found');
      }

      return {
        success: true,
        data: consultation,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create consultation
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('consultation:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createConsultationSchema.parse(request.body);

      // Verify worker belongs to tenant
      const worker = await prisma.worker.findFirst({
        where: { id: body.workerId, tenantId },
      });

      if (!worker) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      const consultation = await prisma.consultation.create({
        data: {
          tenantId,
          ...body,
          receivedById: request.user.userId,
          attachments: body.attachments ?? [],
        },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true } },
          receivedBy: { select: { id: true, name: true } },
        },
      });

      await auditSuccess(request, 'create', 'consultation', consultation.id, {
        after: { category: body.category, priority: body.priority },
      });

      return {
        success: true,
        data: consultation,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Respond to consultation
  fastify.post<{ Params: { id: string } }>(
    '/:id/respond',
    { preHandler: [authenticate, requirePermission('consultation:respond')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = respondSchema.parse(request.body);

      const consultation = await prisma.consultation.findFirst({
        where: { id, tenantId },
      });

      if (!consultation) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Consultation not found');
      }

      if (consultation.status === 'closed') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Consultation is closed');
      }

      const response = await prisma.consultationResponse.create({
        data: {
          consultationId: id,
          responderId: request.user.userId,
          content: body.content,
          language: body.language,
          attachments: body.attachments ?? [],
        },
        include: {
          responder: { select: { id: true, name: true } },
        },
      });

      // Update consultation status
      await prisma.consultation.update({
        where: { id },
        data: { status: 'in_progress' },
      });

      await auditSuccess(request, 'update', 'consultation', id, {
        metadata: { action: 'respond', responseId: response.id },
      });

      return {
        success: true,
        data: response,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Close consultation
  fastify.post<{ Params: { id: string } }>(
    '/:id/close',
    { preHandler: [authenticate, requirePermission('consultation:close')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = closeSchema.parse(request.body);

      const consultation = await prisma.consultation.findFirst({
        where: { id, tenantId },
      });

      if (!consultation) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Consultation not found');
      }

      if (consultation.status === 'closed') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Consultation already closed');
      }

      const updated = await prisma.consultation.update({
        where: { id },
        data: {
          status: 'closed',
          resolution: body.resolution,
          closedAt: new Date(),
          closedById: request.user.userId,
        },
      });

      await auditSuccess(request, 'update', 'consultation', id, {
        metadata: { action: 'close' },
      });

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Escalate consultation
  fastify.post<{ Params: { id: string } }>(
    '/:id/escalate',
    { preHandler: [authenticate, requirePermission('consultation:escalate')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const schema = z.object({
        escalatedToId: z.string(),
        reason: z.string().min(1),
      });

      const body = schema.parse(request.body);

      const consultation = await prisma.consultation.findFirst({
        where: { id, tenantId },
      });

      if (!consultation) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Consultation not found');
      }

      await prisma.consultationEscalation.create({
        data: {
          consultationId: id,
          escalatedById: request.user.userId,
          escalatedToId: body.escalatedToId,
          reason: body.reason,
        },
      });

      await prisma.consultation.update({
        where: { id },
        data: {
          status: 'escalated',
          assigneeId: body.escalatedToId,
        },
      });

      await auditSuccess(request, 'update', 'consultation', id, {
        metadata: { action: 'escalate', escalatedToId: body.escalatedToId },
      });

      return {
        success: true,
        data: { message: 'Consultation escalated' },
        requestId: crypto.randomUUID(),
      };
    }
  );
}
