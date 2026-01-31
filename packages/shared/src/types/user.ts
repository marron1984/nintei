/**
 * ユーザー関連の型定義
 */

export interface User {
  id: string;
  tenantId: string;
  branchId?: string;
  teamId?: string;
  email: string;
  name: string;
  nameKana?: string;
  role: UserRole;
  status: UserStatus;
  preferredLanguage: string;
  timezone: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  // 登録支援機関
  | 'tenant_admin' // 管理者
  | 'support_manager' // 支援責任者
  | 'support_staff' // 支援担当者
  | 'interpreter' // 通訳
  | 'auditor' // 監査閲覧
  // 受入企業
  | 'company_admin' // 管理者
  | 'company_hr' // 人事
  | 'company_supervisor' // 現場上司
  | 'company_viewer' // 閲覧のみ
  // 士業
  | 'professional_admin' // 管理者
  | 'professional_staff' // 実務
  | 'professional_viewer'; // 閲覧のみ

export type UserStatus = 'active' | 'inactive' | 'pending';

export interface UserSession {
  userId: string;
  tenantId: string;
  role: UserRole;
  permissions: string[];
  branchId?: string;
  teamId?: string;
  language: string;
  timezone: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  nameKana?: string;
  role: UserRole;
  branchId?: string;
  teamId?: string;
  preferredLanguage?: string;
  timezone?: string;
}

export interface UpdateUserInput {
  name?: string;
  nameKana?: string;
  role?: UserRole;
  branchId?: string;
  teamId?: string;
  preferredLanguage?: string;
  timezone?: string;
  status?: UserStatus;
}
