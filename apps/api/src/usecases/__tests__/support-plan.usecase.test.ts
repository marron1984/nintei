import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportPlanUseCase } from '../support-plan.usecase';
import { ApplicationError } from '@nintei/shared';

// Mock Prisma Client
const mockPrisma = {
  foreignWorker: {
    findFirst: vi.fn(),
  },
  supportPlanTemplate: {
    findFirst: vi.fn(),
  },
  supportPlan: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  supportPlanItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  supportTask: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  evidence: {
    create: vi.fn(),
  },
};

describe('SupportPlanUseCase', () => {
  let useCase: SupportPlanUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new SupportPlanUseCase(mockPrisma as unknown as any);
  });

  describe('createSupportPlan', () => {
    it('should create a support plan with default 10 items', async () => {
      const input = {
        tenantId: 'tenant-1',
        foreignWorkerId: 'worker-1',
        startDate: new Date('2024-01-01'),
        createdById: 'user-1',
      };

      mockPrisma.foreignWorker.findFirst.mockResolvedValue({
        id: 'worker-1',
        tenantId: 'tenant-1',
      });

      mockPrisma.supportPlan.create.mockResolvedValue({
        id: 'plan-1',
        tenantId: 'tenant-1',
        foreignWorkerId: 'worker-1',
        status: 'draft',
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `item-${i + 1}`,
          itemNumber: i + 1,
        })),
      });

      const result = await useCase.createSupportPlan(input);

      expect(result.items).toHaveLength(10);
      expect(mockPrisma.supportPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            foreignWorkerId: 'worker-1',
            status: 'draft',
          }),
        })
      );
    });

    it('should throw error if worker not found', async () => {
      mockPrisma.foreignWorker.findFirst.mockResolvedValue(null);

      await expect(
        useCase.createSupportPlan({
          tenantId: 'tenant-1',
          foreignWorkerId: 'invalid-worker',
          startDate: new Date(),
          createdById: 'user-1',
        })
      ).rejects.toThrow(ApplicationError);
    });

    it('should use template items when templateId is provided', async () => {
      mockPrisma.foreignWorker.findFirst.mockResolvedValue({
        id: 'worker-1',
        tenantId: 'tenant-1',
      });

      mockPrisma.supportPlanTemplate.findFirst.mockResolvedValue({
        id: 'template-1',
        items: [
          { itemNumber: 1, category: 'custom', title: 'Custom Item', description: 'Custom' },
        ],
      });

      mockPrisma.supportPlan.create.mockResolvedValue({
        id: 'plan-1',
        items: [{ id: 'item-1', itemNumber: 1 }],
      });

      await useCase.createSupportPlan({
        tenantId: 'tenant-1',
        foreignWorkerId: 'worker-1',
        templateId: 'template-1',
        startDate: new Date(),
        createdById: 'user-1',
      });

      expect(mockPrisma.supportPlanTemplate.findFirst).toHaveBeenCalled();
    });
  });

  describe('approveSupportPlan', () => {
    it('should approve a pending plan', async () => {
      mockPrisma.supportPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        tenantId: 'tenant-1',
        status: 'pending_approval',
        createdBy: 'user-1',
      });

      mockPrisma.supportPlan.update.mockResolvedValue({
        id: 'plan-1',
        status: 'active',
        approvedBy: 'user-2',
        approvedAt: expect.any(Date),
      });

      const result = await useCase.approveSupportPlan({
        planId: 'plan-1',
        tenantId: 'tenant-1',
        approverId: 'user-2',
      });

      expect(result.status).toBe('active');
    });

    it('should not allow self-approval (separation of duties)', async () => {
      mockPrisma.supportPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        tenantId: 'tenant-1',
        status: 'pending_approval',
        createdBy: 'user-1',
      });

      await expect(
        useCase.approveSupportPlan({
          planId: 'plan-1',
          tenantId: 'tenant-1',
          approverId: 'user-1', // Same as creator
        })
      ).rejects.toThrow('Cannot approve your own support plan');
    });

    it('should throw error if plan is not pending approval', async () => {
      mockPrisma.supportPlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        tenantId: 'tenant-1',
        status: 'draft',
        createdBy: 'user-1',
      });

      await expect(
        useCase.approveSupportPlan({
          planId: 'plan-1',
          tenantId: 'tenant-1',
          approverId: 'user-2',
        })
      ).rejects.toThrow('Plan is not pending approval');
    });
  });

  describe('completeTask', () => {
    it('should complete a task without consent requirement', async () => {
      mockPrisma.supportTask.findUnique.mockResolvedValue({
        id: 'task-1',
        consentRequired: false,
        planItem: {
          id: 'item-1',
          plan: { tenantId: 'tenant-1' },
        },
      });

      mockPrisma.supportTask.update.mockResolvedValue({
        id: 'task-1',
        status: 'completed',
        completedAt: expect.any(Date),
      });

      mockPrisma.supportPlanItem.findUnique.mockResolvedValue({
        id: 'item-1',
        tasks: [{ status: 'completed' }],
      });

      const result = await useCase.completeTask('task-1', 'tenant-1');

      expect(result.status).toBe('completed');
    });

    it('should not complete task requiring consent without consent', async () => {
      mockPrisma.supportTask.findUnique.mockResolvedValue({
        id: 'task-1',
        consentRequired: true,
        consentObtainedAt: null,
        planItem: {
          id: 'item-1',
          plan: { tenantId: 'tenant-1' },
        },
      });

      await expect(useCase.completeTask('task-1', 'tenant-1')).rejects.toThrow(
        'Consent must be obtained before completing this task'
      );
    });

    it('should complete task with consent when consent is obtained', async () => {
      mockPrisma.supportTask.findUnique.mockResolvedValue({
        id: 'task-1',
        consentRequired: true,
        consentObtainedAt: new Date(),
        planItem: {
          id: 'item-1',
          plan: { tenantId: 'tenant-1' },
        },
      });

      mockPrisma.supportTask.update.mockResolvedValue({
        id: 'task-1',
        status: 'completed',
      });

      mockPrisma.supportPlanItem.findUnique.mockResolvedValue({
        id: 'item-1',
        tasks: [{ status: 'completed' }],
      });

      const result = await useCase.completeTask('task-1', 'tenant-1');

      expect(result.status).toBe('completed');
    });
  });

  describe('recordConsent', () => {
    it('should record consent for a task', async () => {
      mockPrisma.supportTask.findUnique.mockResolvedValue({
        id: 'task-1',
        consentRequired: true,
        planItem: {
          plan: { tenantId: 'tenant-1' },
        },
      });

      mockPrisma.supportTask.update.mockResolvedValue({
        id: 'task-1',
        consentObtainedAt: expect.any(Date),
        consentMethod: 'written',
      });

      const result = await useCase.recordConsent({
        taskId: 'task-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        method: 'written',
      });

      expect(result.consentMethod).toBe('written');
    });

    it('should throw error for task not requiring consent', async () => {
      mockPrisma.supportTask.findUnique.mockResolvedValue({
        id: 'task-1',
        consentRequired: false,
        planItem: {
          plan: { tenantId: 'tenant-1' },
        },
      });

      await expect(
        useCase.recordConsent({
          taskId: 'task-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          method: 'written',
        })
      ).rejects.toThrow('This task does not require consent');
    });
  });
});
