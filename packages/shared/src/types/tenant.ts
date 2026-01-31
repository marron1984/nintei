/**
 * テナント（登録支援機関）関連の型定義
 */

export interface Tenant {
  id: string;
  name: string;
  registrationNumber: string; // 登録番号
  status: TenantStatus;
  timezone: string;
  defaultLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantStatus = 'active' | 'suspended' | 'pending';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: Address;
  timezone: string;
  isHeadquarters: boolean;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type BranchStatus = 'active' | 'inactive';

export interface Team {
  id: string;
  branchId: string;
  name: string;
  code: string;
  status: TeamStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamStatus = 'active' | 'inactive';

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
  country: string;
}

export interface OrganizationHierarchy {
  tenant: Tenant;
  branches: BranchWithTeams[];
}

export interface BranchWithTeams extends Branch {
  teams: Team[];
}
