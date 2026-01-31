import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';

export async function auditRoutes(fastify: FastifyInstance) {
  // List audit logs (read-only)
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('audit:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as {
        userId?: string;
        action?: string;
        resource?: string;
        resourceId?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const where: Record<string, unknown> = { tenantId };

      if (query.userId) where.userId = query.userId;
      if (query.action) where.action = query.action;
      if (query.resource) where.resource = query.resource;
      if (query.resourceId) where.resourceId = query.resourceId;
      if (query.status) where.status = query.status;

      if (query.startDate || query.endDate) {
        where.timestamp = {};
        if (query.startDate) {
          (where.timestamp as Record<string, unknown>).gte = new Date(query.startDate);
        }
        if (query.endDate) {
          (where.timestamp as Record<string, unknown>).lte = new Date(query.endDate);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          take: parseInt(query.limit ?? '100', 10),
          skip: parseInt(query.offset ?? '0', 10),
          orderBy: { timestamp: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: logs,
          total,
          limit: parseInt(query.limit ?? '100', 10),
          offset: parseInt(query.offset ?? '0', 10),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get audit log by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('audit:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const log = await prisma.auditLog.findFirst({
        where: { id, tenantId },
      });

      if (!log) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'Audit log not found');
      }

      return {
        success: true,
        data: log,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get audit logs for specific resource
  fastify.get<{ Params: { resource: string; resourceId: string } }>(
    '/resource/:resource/:resourceId',
    { preHandler: [authenticate, requirePermission('audit:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { resource, resourceId } = request.params;

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          resource,
          resourceId,
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      return {
        success: true,
        data: logs,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get user activity
  fastify.get<{ Params: { userId: string } }>(
    '/user/:userId',
    { preHandler: [authenticate, requirePermission('audit:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { userId } = request.params;

      const query = request.query as { limit?: string };

      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          userId,
        },
        orderBy: { timestamp: 'desc' },
        take: parseInt(query.limit ?? '50', 10),
      });

      return {
        success: true,
        data: logs,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get audit summary (for dashboard)
  fastify.get(
    '/summary',
    { preHandler: [authenticate, requirePermission('audit:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const query = request.query as { days?: string };
      const days = parseInt(query.days ?? '7', 10);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalActions,
        failedActions,
        loginCount,
        actionsByResource,
      ] = await Promise.all([
        prisma.auditLog.count({
          where: { tenantId, timestamp: { gte: startDate } },
        }),
        prisma.auditLog.count({
          where: { tenantId, timestamp: { gte: startDate }, status: 'failure' },
        }),
        prisma.auditLog.count({
          where: { tenantId, timestamp: { gte: startDate }, action: 'login' },
        }),
        prisma.auditLog.groupBy({
          by: ['resource'],
          where: { tenantId, timestamp: { gte: startDate } },
          _count: true,
        }),
      ]);

      return {
        success: true,
        data: {
          period: { days, startDate },
          totalActions,
          failedActions,
          loginCount,
          actionsByResource: actionsByResource.map((r) => ({
            resource: r.resource,
            count: r._count,
          })),
        },
        requestId: crypto.randomUUID(),
      };
    }
  );
}
