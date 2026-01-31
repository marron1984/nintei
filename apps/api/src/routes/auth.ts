import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApplicationError } from '@nintei/shared';
import { auditSuccess, auditFailure } from '../lib/audit.js';
import { authenticate, type JwtPayload } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantId: z.string(),
  role: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { tenant: true },
    });

    if (!user) {
      await auditFailure(request, 'login', 'user', 'unknown', 'User not found');
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      await auditFailure(request, 'login', 'user', user.id, 'Invalid password');
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status !== 'active') {
      await auditFailure(request, 'login', 'user', user.id, 'User inactive');
      throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Account is not active');
    }

    if (user.tenant.status !== 'active') {
      await auditFailure(request, 'login', 'user', user.id, 'Tenant inactive');
      throw new ApplicationError('AUTH_RESOURCE_FORBIDDEN', 'Organization is not active');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      // Return partial token for 2FA flow
      const partialToken = await reply.jwtSign(
        { userId: user.id, requires2FA: true },
        { expiresIn: '5m' }
      );

      return {
        success: true,
        data: {
          requires2FA: true,
          token: partialToken,
        },
        requestId: crypto.randomUUID(),
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role as JwtPayload['role'],
      branchId: user.branchId ?? undefined,
      teamId: user.teamId ?? undefined,
      companyId: user.companyId ?? undefined,
    };

    const token = await reply.jwtSign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });

    await auditSuccess(request, 'login', 'user', user.id);

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          preferredLanguage: user.preferredLanguage,
          timezone: user.timezone,
        },
      },
      requestId: crypto.randomUUID(),
    };
  });

  // Get current user
  fastify.get('/me', { preHandler: [authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        nameKana: true,
        role: true,
        tenantId: true,
        branchId: true,
        teamId: true,
        companyId: true,
        preferredLanguage: true,
        timezone: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
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
  });

  // Logout (for audit purposes)
  fastify.post('/logout', { preHandler: [authenticate] }, async (request) => {
    await auditSuccess(request, 'logout', 'user', request.user.userId);

    return {
      success: true,
      data: { message: 'Logged out successfully' },
      requestId: crypto.randomUUID(),
    };
  });

  // Change password
  fastify.post('/change-password', { preHandler: [authenticate] }, async (request) => {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    });

    const body = schema.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
    });

    if (!user) {
      throw new ApplicationError('RESOURCE_NOT_FOUND', 'User not found');
    }

    const validPassword = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await auditSuccess(request, 'update', 'user', user.id, {
      metadata: { action: 'password_change' },
    });

    return {
      success: true,
      data: { message: 'Password changed successfully' },
      requestId: crypto.randomUUID(),
    };
  });
}
