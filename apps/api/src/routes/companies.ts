import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createCompanySchema = z.object({
  name: z.string().min(1),
  nameKana: z.string().optional(),
  corporateNumber: z.string().optional(),
  industry: z.string(),
  contractStartDate: z.string().transform((s) => new Date(s)),
  contractEndDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  headquarters: z.object({
    postalCode: z.string().optional(),
    prefecture: z.string().optional(),
    city: z.string().optional(),
    street: z.string().optional(),
    building: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
  }),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  nameKana: z.string().optional(),
  corporateNumber: z.string().optional(),
  industry: z.string().optional(),
  status: z.string().optional(),
  contractStartDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  contractEndDate: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
});

export async function companyRoutes(fastify: FastifyInstance) {
  // List companies
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('company:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        status?: string;
        search?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.status) {
        where.status = query.status;
      }
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { nameKana: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [companies, total] = await Promise.all([
        prisma.company.findMany({
          where,
          select: {
            id: true,
            name: true,
            nameKana: true,
            corporateNumber: true,
            industry: true,
            status: true,
            contractStartDate: true,
            contractEndDate: true,
            createdAt: true,
            _count: {
              select: { workers: true, offices: true },
            },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.company.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: companies,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get company by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('company:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const company = await prisma.company.findFirst({
        where: { id, tenantId },
        include: {
          offices: {
            include: {
              sites: true,
              contacts: true,
            },
          },
          _count: {
            select: { workers: true },
          },
        },
      });

      if (!company) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Company not found');
      }

      return {
        success: true,
        data: company,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create company
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('company:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createCompanySchema.parse(request.body);

      const company = await prisma.company.create({
        data: {
          tenantId,
          name: body.name,
          nameKana: body.nameKana,
          corporateNumber: body.corporateNumber,
          industry: body.industry,
          contractStartDate: body.contractStartDate,
          contractEndDate: body.contractEndDate,
          offices: {
            create: {
              name: '本社',
              isHeadquarters: true,
              ...body.headquarters,
            },
          },
        },
        include: {
          offices: true,
        },
      });

      await auditSuccess(request, 'create', 'company', company.id, {
        after: { name: company.name, industry: company.industry },
      });

      return {
        success: true,
        data: company,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Update company
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('company:update')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = updateCompanySchema.parse(request.body);

      const existing = await prisma.company.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Company not found');
      }

      const company = await prisma.company.update({
        where: { id },
        data: body,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
      });

      await auditSuccess(request, 'update', 'company', company.id, {
        before: { name: existing.name, status: existing.status },
        after: body,
      });

      return {
        success: true,
        data: company,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Add office to company
  fastify.post<{ Params: { id: string } }>(
    '/:id/offices',
    { preHandler: [authenticate, requirePermission('company:update')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const company = await prisma.company.findFirst({
        where: { id, tenantId },
      });

      if (!company) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Company not found');
      }

      const schema = z.object({
        name: z.string().min(1),
        postalCode: z.string().optional(),
        prefecture: z.string().optional(),
        city: z.string().optional(),
        street: z.string().optional(),
        building: z.string().optional(),
        phone: z.string().optional(),
        fax: z.string().optional(),
        isHeadquarters: z.boolean().default(false),
      });

      const body = schema.parse(request.body);

      const office = await prisma.companyOffice.create({
        data: {
          companyId: id,
          ...body,
        },
      });

      return {
        success: true,
        data: office,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get company workers
  fastify.get<{ Params: { id: string } }>(
    '/:id/workers',
    { preHandler: [authenticate, requirePermission('company:read', 'worker:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const company = await prisma.company.findFirst({
        where: { id, tenantId },
      });

      if (!company) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Company not found');
      }

      const workers = await prisma.worker.findMany({
        where: { companyId: id, tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationality: true,
          residenceStatus: true,
          residenceExpiry: true,
          status: true,
          office: { select: { id: true, name: true } },
          site: { select: { id: true, name: true } },
        },
        orderBy: { lastName: 'asc' },
      });

      return {
        success: true,
        data: workers,
        requestId: crypto.randomUUID(),
      };
    }
  );
}
