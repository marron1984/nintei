import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createWorkerSchema = z.object({
  companyId: z.string(),
  officeId: z.string().optional(),
  siteId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  firstNameKana: z.string().optional(),
  lastNameKana: z.string().optional(),
  firstNameNative: z.string().optional(),
  lastNameNative: z.string().optional(),
  dateOfBirth: z.string().transform((s) => new Date(s)),
  gender: z.enum(['male', 'female', 'other']),
  nationality: z.string(),
  email: z.string().email().optional(),
  phone: z.string(),
  postalCode: z.string().optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
  building: z.string().optional(),
  nativeLanguage: z.string(),
  understandsLanguages: z.array(z.string()).default([]),
  japaneseLevel: z.string().optional(),
  residenceCardNumber: z.string(),
  residenceStatus: z.string(),
  residencePeriod: z.string(),
  residenceExpiry: z.string().transform((s) => new Date(s)),
  residenceIssueDate: z.string().transform((s) => new Date(s)),
  contractStartDate: z.string().transform((s) => new Date(s)),
  contractEndDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  jobCategory: z.string(),
  occupation: z.string(),
  salary: z.number(),
  salaryType: z.enum(['monthly', 'hourly']),
  workingHoursPerWeek: z.number(),
  supportStartDate: z.string().transform((s) => new Date(s)),
});

const updateWorkerSchema = createWorkerSchema.partial();

export async function workerRoutes(fastify: FastifyInstance) {
  // List workers
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('worker:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        companyId?: string;
        status?: string;
        search?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.companyId) {
        where.companyId = query.companyId;
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { firstNameKana: { contains: query.search, mode: 'insensitive' } },
          { lastNameKana: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [workers, total] = await Promise.all([
        prisma.worker.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameKana: true,
            lastNameKana: true,
            nationality: true,
            nativeLanguage: true,
            residenceStatus: true,
            residenceExpiry: true,
            status: true,
            company: { select: { id: true, name: true } },
            office: { select: { id: true, name: true } },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.worker.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: workers,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get worker by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('worker:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const worker = await prisma.worker.findFirst({
        where: { id, tenantId },
        include: {
          company: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
          alerts: {
            where: { status: 'pending' },
            orderBy: { dueDate: 'asc' },
            take: 5,
          },
        },
      });

      if (!worker) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      return {
        success: true,
        data: worker,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create worker
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('worker:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createWorkerSchema.parse(request.body);

      // Verify company belongs to tenant
      const company = await prisma.company.findFirst({
        where: { id: body.companyId, tenantId },
      });

      if (!company) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Company not found');
      }

      const worker = await prisma.worker.create({
        data: {
          tenantId,
          ...body,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationality: true,
          residenceStatus: true,
          status: true,
          createdAt: true,
        },
      });

      // Create residence expiry alert
      await prisma.workerAlert.create({
        data: {
          workerId: worker.id,
          type: 'residence_expiry',
          message: `在留期限が近づいています: ${body.residenceExpiry.toLocaleDateString('ja-JP')}`,
          dueDate: body.residenceExpiry,
          status: 'pending',
        },
      });

      await auditSuccess(request, 'create', 'worker', worker.id, {
        after: {
          name: `${body.lastName} ${body.firstName}`,
          nationality: body.nationality,
          residenceStatus: body.residenceStatus,
        },
      });

      return {
        success: true,
        data: worker,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Update worker
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('worker:update')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = updateWorkerSchema.parse(request.body);

      const existing = await prisma.worker.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      const worker = await prisma.worker.update({
        where: { id },
        data: body,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          updatedAt: true,
        },
      });

      await auditSuccess(request, 'update', 'worker', worker.id, {
        before: { status: existing.status },
        after: body,
      });

      return {
        success: true,
        data: worker,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get worker alerts
  fastify.get<{ Params: { id: string } }>(
    '/:id/alerts',
    { preHandler: [authenticate, requirePermission('worker:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const worker = await prisma.worker.findFirst({
        where: { id, tenantId },
      });

      if (!worker) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Worker not found');
      }

      const alerts = await prisma.workerAlert.findMany({
        where: { workerId: id },
        orderBy: { dueDate: 'asc' },
      });

      return {
        success: true,
        data: alerts,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get workers with expiring residence
  fastify.get(
    '/alerts/residence-expiry',
    { preHandler: [authenticate, requirePermission('worker:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const query = request.query as { days?: string };
      const days = parseInt(query.days ?? '90', 10);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const workers = await prisma.worker.findMany({
        where: {
          tenantId,
          status: 'active',
          residenceExpiry: {
            lte: futureDate,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationality: true,
          residenceStatus: true,
          residenceExpiry: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { residenceExpiry: 'asc' },
      });

      return {
        success: true,
        data: workers,
        requestId: crypto.randomUUID(),
      };
    }
  );
}
