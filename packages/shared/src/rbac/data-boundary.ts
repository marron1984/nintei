/**
 * データ境界（拠点単位の閲覧制限）
 */

import type { UserRole } from '../types/user.js';

export interface DataBoundary {
  tenantId: string;
  branchIds?: string[];
  teamIds?: string[];
  companyIds?: string[];
  workerIds?: string[];
}

export type BoundaryScope = 'tenant' | 'branch' | 'team' | 'company' | 'self';

/**
 * ロールごとのデフォルトスコープ
 */
export const ROLE_DEFAULT_SCOPE: Record<UserRole, BoundaryScope> = {
  // 登録支援機関
  tenant_admin: 'tenant',
  support_manager: 'branch',
  support_staff: 'team',
  interpreter: 'team',
  auditor: 'tenant',
  // 受入企業
  company_admin: 'company',
  company_hr: 'company',
  company_supervisor: 'company',
  company_viewer: 'company',
  // 士業
  professional_admin: 'company',
  professional_staff: 'company',
  professional_viewer: 'company',
};

/**
 * データ境界をマージ
 */
export function mergeDataBoundaries(
  base: DataBoundary,
  override: Partial<DataBoundary>
): DataBoundary {
  return {
    tenantId: override.tenantId ?? base.tenantId,
    branchIds: override.branchIds ?? base.branchIds,
    teamIds: override.teamIds ?? base.teamIds,
    companyIds: override.companyIds ?? base.companyIds,
    workerIds: override.workerIds ?? base.workerIds,
  };
}

/**
 * スコープに基づいてデータ境界を生成
 */
export function createDataBoundary(
  scope: BoundaryScope,
  context: {
    tenantId: string;
    branchId?: string;
    teamId?: string;
    companyId?: string;
    userId?: string;
  }
): DataBoundary {
  const boundary: DataBoundary = { tenantId: context.tenantId };

  switch (scope) {
    case 'tenant':
      // テナント全体
      break;
    case 'branch':
      if (context.branchId) {
        boundary.branchIds = [context.branchId];
      }
      break;
    case 'team':
      if (context.teamId) {
        boundary.teamIds = [context.teamId];
      }
      break;
    case 'company':
      if (context.companyId) {
        boundary.companyIds = [context.companyId];
      }
      break;
    case 'self':
      // 本人のみ
      break;
  }

  return boundary;
}
