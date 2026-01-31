import type { FastifyRequest } from 'fastify';
import { prisma } from './prisma.js';
import type { AuditAction, AuditResource, AuditStatus } from '@nintei/shared';

export interface AuditContext {
  request: FastifyRequest;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName?: string;
  details?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
  status: AuditStatus;
  errorMessage?: string;
}

export async function createAuditLog(context: AuditContext) {
  const { request, action, resource, resourceId, resourceName, details, status, errorMessage } =
    context;

  const user = request.user;
  if (!user) {
    return; // Skip audit if no user context
  }

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        userRole: user.role,
        userEmail: '', // Would need to fetch from user
        action,
        resource,
        resourceId,
        resourceName,
        ipAddress: request.ip ?? 'unknown',
        userAgent: request.headers['user-agent'] ?? 'unknown',
        details: details ?? {},
        status,
        errorMessage,
      },
    });
  } catch (error) {
    request.log.error({ error, context }, 'Failed to create audit log');
  }
}

export function auditSuccess(
  request: FastifyRequest,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string,
  details?: AuditContext['details']
) {
  return createAuditLog({
    request,
    action,
    resource,
    resourceId,
    details,
    status: 'success',
  });
}

export function auditFailure(
  request: FastifyRequest,
  action: AuditAction,
  resource: AuditResource,
  resourceId: string,
  errorMessage: string,
  details?: AuditContext['details']
) {
  return createAuditLog({
    request,
    action,
    resource,
    resourceId,
    details,
    status: 'failure',
    errorMessage,
  });
}
