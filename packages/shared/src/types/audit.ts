/**
 * 監査ログ関連の型定義
 */

export interface AuditLog {
  id: string;
  tenantId: string;
  // 誰が
  userId: string;
  userRole: string;
  userEmail: string;
  // いつ
  timestamp: Date;
  // 何を
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName?: string;
  // どこから
  ipAddress: string;
  userAgent: string;
  // 詳細
  details: AuditDetails;
  // 結果
  status: AuditStatus;
  errorMessage?: string;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'export'
  | 'login'
  | 'logout'
  | 'permission_change';

export type AuditResource =
  | 'user'
  | 'worker'
  | 'company'
  | 'support_plan'
  | 'support_task'
  | 'interview'
  | 'consultation'
  | 'document'
  | 'template'
  | 'tenant'
  | 'branch'
  | 'team';

export type AuditStatus = 'success' | 'failure';

export interface AuditDetails {
  // 変更前後の値（更新時）
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  // 追加情報
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AuditStatus;
  limit?: number;
  offset?: number;
}

export interface CreateAuditLogInput {
  tenantId: string;
  userId: string;
  userRole: string;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName?: string;
  ipAddress: string;
  userAgent: string;
  details: AuditDetails;
  status: AuditStatus;
  errorMessage?: string;
}
