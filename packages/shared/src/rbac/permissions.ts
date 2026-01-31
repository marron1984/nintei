/**
 * RBAC権限定義
 * 原則：入力と承認を分離、承認済みで書類出力可、監査ログは追記のみ
 */

import type { UserRole } from '../types/user.js';

export type Permission =
  // テナント管理
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant:manage_branches'
  | 'tenant:manage_teams'
  // ユーザー管理
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_roles'
  // 企業管理
  | 'company:create'
  | 'company:read'
  | 'company:update'
  | 'company:delete'
  | 'company:manage_contacts'
  // 外国人管理
  | 'worker:create'
  | 'worker:read'
  | 'worker:update'
  | 'worker:delete'
  | 'worker:view_sensitive' // 個人情報閲覧
  // 支援計画
  | 'support_plan:create'
  | 'support_plan:read'
  | 'support_plan:update'
  | 'support_plan:approve'
  | 'support_plan:delete'
  // タスク
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:assign'
  | 'task:complete'
  // 面談
  | 'interview:create'
  | 'interview:read'
  | 'interview:update'
  | 'interview:record'
  | 'interview:delete'
  // 相談
  | 'consultation:create'
  | 'consultation:read'
  | 'consultation:update'
  | 'consultation:respond'
  | 'consultation:close'
  | 'consultation:escalate'
  // 書類
  | 'document:create'
  | 'document:read'
  | 'document:update'
  | 'document:approve'
  | 'document:export' // 承認済みのみ出力可
  | 'document:delete'
  // テンプレート
  | 'template:create'
  | 'template:read'
  | 'template:update'
  | 'template:approve'
  | 'template:delete'
  // 監査
  | 'audit:read' // 監査ログは読み取り専用
  // 通知
  | 'notification:read'
  | 'notification:manage';

/**
 * ロールごとの権限マッピング
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // 登録支援機関
  tenant_admin: [
    'tenant:read',
    'tenant:update',
    'tenant:manage_branches',
    'tenant:manage_teams',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage_roles',
    'company:create',
    'company:read',
    'company:update',
    'company:delete',
    'company:manage_contacts',
    'worker:create',
    'worker:read',
    'worker:update',
    'worker:delete',
    'worker:view_sensitive',
    'support_plan:create',
    'support_plan:read',
    'support_plan:update',
    'support_plan:approve',
    'support_plan:delete',
    'task:create',
    'task:read',
    'task:update',
    'task:assign',
    'task:complete',
    'interview:create',
    'interview:read',
    'interview:update',
    'interview:record',
    'interview:delete',
    'consultation:create',
    'consultation:read',
    'consultation:update',
    'consultation:respond',
    'consultation:close',
    'consultation:escalate',
    'document:create',
    'document:read',
    'document:update',
    'document:approve',
    'document:export',
    'document:delete',
    'template:create',
    'template:read',
    'template:update',
    'template:approve',
    'template:delete',
    'audit:read',
    'notification:read',
    'notification:manage',
  ],
  support_manager: [
    'tenant:read',
    'user:read',
    'user:create',
    'user:update',
    'company:create',
    'company:read',
    'company:update',
    'company:manage_contacts',
    'worker:create',
    'worker:read',
    'worker:update',
    'worker:view_sensitive',
    'support_plan:create',
    'support_plan:read',
    'support_plan:update',
    'support_plan:approve',
    'task:create',
    'task:read',
    'task:update',
    'task:assign',
    'task:complete',
    'interview:create',
    'interview:read',
    'interview:update',
    'interview:record',
    'consultation:create',
    'consultation:read',
    'consultation:update',
    'consultation:respond',
    'consultation:close',
    'consultation:escalate',
    'document:create',
    'document:read',
    'document:update',
    'document:approve',
    'document:export',
    'template:read',
    'template:update',
    'audit:read',
    'notification:read',
    'notification:manage',
  ],
  support_staff: [
    'tenant:read',
    'user:read',
    'company:read',
    'company:manage_contacts',
    'worker:create',
    'worker:read',
    'worker:update',
    'support_plan:create',
    'support_plan:read',
    'support_plan:update',
    'task:create',
    'task:read',
    'task:update',
    'task:complete',
    'interview:create',
    'interview:read',
    'interview:update',
    'interview:record',
    'consultation:create',
    'consultation:read',
    'consultation:update',
    'consultation:respond',
    'document:create',
    'document:read',
    'document:update',
    'template:read',
    'notification:read',
  ],
  interpreter: [
    'tenant:read',
    'worker:read',
    'interview:read',
    'interview:update',
    'consultation:read',
    'consultation:update',
    'notification:read',
  ],
  auditor: [
    'tenant:read',
    'user:read',
    'company:read',
    'worker:read',
    'support_plan:read',
    'task:read',
    'interview:read',
    'consultation:read',
    'document:read',
    'template:read',
    'audit:read',
    'notification:read',
  ],
  // 受入企業
  company_admin: [
    'company:read',
    'company:update',
    'company:manage_contacts',
    'worker:read',
    'worker:view_sensitive',
    'support_plan:read',
    'task:read',
    'interview:read',
    'consultation:create',
    'consultation:read',
    'document:read',
    'notification:read',
  ],
  company_hr: [
    'company:read',
    'worker:read',
    'worker:view_sensitive',
    'support_plan:read',
    'task:read',
    'interview:read',
    'consultation:create',
    'consultation:read',
    'document:read',
    'notification:read',
  ],
  company_supervisor: [
    'company:read',
    'worker:read',
    'support_plan:read',
    'task:read',
    'interview:read',
    'consultation:create',
    'consultation:read',
    'notification:read',
  ],
  company_viewer: [
    'company:read',
    'worker:read',
    'support_plan:read',
    'interview:read',
    'notification:read',
  ],
  // 士業
  professional_admin: [
    'company:read',
    'worker:read',
    'worker:view_sensitive',
    'support_plan:read',
    'support_plan:update',
    'task:read',
    'interview:read',
    'consultation:read',
    'document:create',
    'document:read',
    'document:update',
    'document:export',
    'template:read',
    'notification:read',
  ],
  professional_staff: [
    'company:read',
    'worker:read',
    'worker:view_sensitive',
    'support_plan:read',
    'task:read',
    'interview:read',
    'consultation:read',
    'document:create',
    'document:read',
    'document:update',
    'template:read',
    'notification:read',
  ],
  professional_viewer: [
    'company:read',
    'worker:read',
    'support_plan:read',
    'interview:read',
    'document:read',
    'notification:read',
  ],
};

/**
 * 権限チェック関数
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * 複数権限のいずれかを持つかチェック
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * 複数権限のすべてを持つかチェック
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * ロールの全権限を取得
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
