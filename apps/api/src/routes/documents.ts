import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createDocumentSchema = z.object({
  templateId: z.string(),
  workerId: z.string().optional(),
  companyId: z.string().optional(),
  title: z.string().min(1),
  language: z.string(),
  variables: z.record(z.unknown()),
});

export async function documentRoutes(fastify: FastifyInstance) {
  // List documents
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('document:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        workerId?: string;
        status?: string;
        category?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.workerId) where.workerId = query.workerId;
      if (query.status) where.status = query.status;

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          include: {
            template: { select: { id: true, name: true, category: true } },
            worker: { select: { id: true, firstName: true, lastName: true } },
            creator: { select: { id: true, name: true } },
            approver: { select: { id: true, name: true } },
          },
          take: parseInt(query.limit ?? '50', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.document.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: documents,
          total,
          limit: parseInt(query.limit ?? '50', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get document by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('document:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const document = await prisma.document.findFirst({
        where: { id, tenantId },
        include: {
          template: true,
          worker: { select: { id: true, firstName: true, lastName: true } },
          creator: { select: { id: true, name: true } },
          approver: { select: { id: true, name: true } },
          versions: {
            orderBy: { version: 'desc' },
          },
        },
      });

      if (!document) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
      }

      return {
        success: true,
        data: document,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create document
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('document:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createDocumentSchema.parse(request.body);

      // Verify template exists
      const template = await prisma.documentTemplate.findFirst({
        where: { id: body.templateId, tenantId, status: 'active' },
      });

      if (!template) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Template not found');
      }

      // Validate required variables
      const templateVariables = template.variables as Array<{
        key: string;
        required: boolean;
        label: string;
      }>;
      const missingFields: string[] = [];

      for (const variable of templateVariables) {
        if (variable.required && !(variable.key in body.variables)) {
          missingFields.push(variable.label);
        }
      }

      const validationErrors =
        missingFields.length > 0
          ? missingFields.map((field) => ({
              field,
              message: 'Required field is missing',
              severity: 'error' as const,
            }))
          : null;

      const document = await prisma.document.create({
        data: {
          tenantId,
          templateId: body.templateId,
          workerId: body.workerId,
          companyId: body.companyId,
          title: body.title,
          language: body.language,
          variables: body.variables,
          validationStatus: validationErrors ? 'invalid' : 'valid',
          validationErrors: validationErrors,
          createdById: request.user.userId,
        },
        include: {
          template: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      });

      await auditSuccess(request, 'create', 'document', document.id, {
        after: { title: body.title, templateId: body.templateId },
      });

      return {
        success: true,
        data: document,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Submit document for approval
  fastify.post<{ Params: { id: string } }>(
    '/:id/submit',
    { preHandler: [authenticate, requirePermission('document:update')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const document = await prisma.document.findFirst({
        where: { id, tenantId },
      });

      if (!document) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
      }

      if (document.validationStatus !== 'valid') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Document has validation errors');
      }

      if (document.status !== 'draft') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Document is not in draft status');
      }

      const updated = await prisma.document.update({
        where: { id },
        data: { status: 'pending_approval' },
      });

      await auditSuccess(request, 'submit', 'document', id);

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Approve document
  fastify.post<{ Params: { id: string } }>(
    '/:id/approve',
    { preHandler: [authenticate, requirePermission('document:approve')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const document = await prisma.document.findFirst({
        where: { id, tenantId },
      });

      if (!document) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
      }

      if (document.status !== 'pending_approval') {
        throw new ApplicationError('BUSINESS_INVALID_STATE', 'Document is not pending approval');
      }

      // Cannot approve own document
      if (document.createdById === request.user.userId) {
        throw new ApplicationError('AUTH_PERMISSION_DENIED', 'Cannot approve your own document');
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          status: 'approved',
          approvedById: request.user.userId,
          approvedAt: new Date(),
        },
      });

      await auditSuccess(request, 'approve', 'document', id);

      return {
        success: true,
        data: updated,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Export document (only approved)
  fastify.get<{ Params: { id: string } }>(
    '/:id/export',
    { preHandler: [authenticate, requirePermission('document:export')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const document = await prisma.document.findFirst({
        where: { id, tenantId },
        include: { template: true },
      });

      if (!document) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Document not found');
      }

      if (document.status !== 'approved' && document.status !== 'submitted') {
        throw new ApplicationError('BUSINESS_APPROVAL_REQUIRED', 'Document must be approved first');
      }

      await auditSuccess(request, 'export', 'document', id);

      // In real implementation, this would generate PDF/Excel
      return {
        success: true,
        data: {
          documentId: document.id,
          title: document.title,
          fileUrl: document.generatedFileUrl,
          message: 'Document export initiated',
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // List templates
  fastify.get(
    '/templates',
    { preHandler: [authenticate, requirePermission('template:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as { category?: string; status?: string };

      const where: Record<string, unknown> = { tenantId };
      if (query.category) where.category = query.category;
      if (query.status) where.status = query.status;

      const templates = await prisma.documentTemplate.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          type: true,
          version: true,
          status: true,
          isLegalDocument: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      });

      return {
        success: true,
        data: templates,
        requestId: crypto.randomUUID(),
      };
    }
  );
}
