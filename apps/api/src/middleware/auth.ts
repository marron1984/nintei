import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApplicationError, hasPermission, type Permission, type UserRole } from '@nintei/shared';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  branchId?: string;
  teamId?: string;
  companyId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new ApplicationError('AUTH_TOKEN_INVALID', 'No token provided');
    }

    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = decoded;
  } catch {
    throw new ApplicationError('AUTH_TOKEN_INVALID', 'Invalid or expired token');
  }
}

export function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      throw new ApplicationError('AUTH_TOKEN_INVALID', 'Not authenticated');
    }

    const hasRequired = permissions.some((p) => hasPermission(request.user.role, p));
    if (!hasRequired) {
      throw new ApplicationError(
        'AUTH_PERMISSION_DENIED',
        `Required permissions: ${permissions.join(' or ')}`
      );
    }
  };
}

export function requireTenant(request: FastifyRequest) {
  if (!request.user?.tenantId) {
    throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Tenant access required');
  }
  return request.user.tenantId;
}
