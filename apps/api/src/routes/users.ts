import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { authenticate, requirePermission, requireTenant } from '../middleware/auth.js';
import { auditSuccess } from '../lib/audit.js';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  nameKana: z.string().optional(),
  role: z.string(),
  branchId: z.string().optional(),
  teamId: z.string().optional(),
  companyId: z.string().optional(),
  preferredLanguage: z.string().default('ja'),
  timezone: z.string().default('Asia/Tokyo'),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  nameKana: z.string().optional(),
  role: z.string().optional(),
  branchId: z.string().optional(),
  teamId: z.string().optional(),
  status: z.string().optional(),
  preferredLanguage: z.string().optional(),
  timezone: z.string().optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // List users
  fastify.get(
    '/',
    { preHandler: [authenticate, requirePermission('user:read')] },
    async (request) => {
      const tenantId = requireTenant(request);

      const users = await prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          nameKana: true,
          role: true,
          status: true,
          branchId: true,
          teamId: true,
          companyId: true,
          preferredLanguage: true,
          timezone: true,
          lastLoginAt: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: users,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Get user by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('user:read')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const user = await prisma.user.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          nameKana: true,
          role: true,
          status: true,
          branchId: true,
          teamId: true,
          companyId: true,
          preferredLanguage: true,
          timezone: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          branch: { select: { id: true, name: true, code: true } },
          team: { select: { id: true, name: true, code: true } },
          company: { select: { id: true, name: true } },
        },
      });

      if (!user) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found');
      }

      return {
        success: true,
        data: user,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Create user
  fastify.post(
    '/',
    { preHandler: [authenticate, requirePermission('user:create')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const body = createUserSchema.parse(request.body);

      // Check if email already exists
      const existing = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existing) {
        throw new ApplicationError('RESOURCE_ALREADY_EXISTS', 'Email already registered');
      }

      const passwordHash = await bcrypt.hash(body.password, 12);

      const user = await prisma.user.create({
        data: {
          tenantId,
          email: body.email,
          passwordHash,
          name: body.name,
          nameKana: body.nameKana,
          role: body.role,
          branchId: body.branchId,
          teamId: body.teamId,
          companyId: body.companyId,
          preferredLanguage: body.preferredLanguage,
          timezone: body.timezone,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      await auditSuccess(request, 'create', 'user', user.id, {
        after: { email: user.email, role: user.role },
      });

      return {
        success: true,
        data: user,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Update user
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('user:update')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;
      const body = updateUserSchema.parse(request.body);

      const existing = await prisma.user.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found');
      }

      const user = await prisma.user.update({
        where: { id },
        data: body,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      await auditSuccess(request, 'update', 'user', user.id, {
        before: { name: existing.name, role: existing.role, status: existing.status },
        after: body,
      });

      return {
        success: true,
        data: user,
        requestId: crypto.randomUUID(),
      };
    }
  );

  // Delete user
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [authenticate, requirePermission('user:delete')] },
    async (request) => {
      const tenantId = requireTenant(request);
      const { id } = request.params;

      const existing = await prisma.user.findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found');
      }

      // Soft delete by setting status to inactive
      await prisma.user.update({
        where: { id },
        data: { status: 'inactive' },
      });

      await auditSuccess(request, 'delete', 'user', id, {
        metadata: { softDelete: true },
      });

      return {
        success: true,
        data: { message: 'User deleted successfully' },
        requestId: crypto.randomUUID(),
      };
    }
  );
}
