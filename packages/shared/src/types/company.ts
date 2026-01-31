/**
 * 受入企業関連の型定義
 */

import type { Address } from './tenant.js';

export interface Company {
  id: string;
  tenantId: string;
  name: string;
  nameKana?: string;
  corporateNumber?: string; // 法人番号
  industry: string;
  status: CompanyStatus;
  contractStartDate: Date;
  contractEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanyStatus = 'active' | 'inactive' | 'pending';

export interface CompanyOffice {
  id: string;
  companyId: string;
  name: string;
  address: Address;
  phone: string;
  fax?: string;
  isHeadquarters: boolean;
  status: OfficeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OfficeStatus = 'active' | 'inactive';

export interface CompanySite {
  id: string;
  officeId: string;
  name: string;
  address: Address;
  status: SiteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SiteStatus = 'active' | 'inactive';

export interface CompanyContact {
  id: string;
  companyId: string;
  officeId?: string;
  userId?: string; // リンクされたユーザー
  name: string;
  nameKana?: string;
  position: string;
  email: string;
  phone: string;
  isMainContact: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  name: string;
  nameKana?: string;
  corporateNumber?: string;
  industry: string;
  contractStartDate: Date;
  contractEndDate?: Date;
  headquarters: {
    address: Address;
    phone: string;
    fax?: string;
  };
  mainContact: {
    name: string;
    nameKana?: string;
    position: string;
    email: string;
    phone: string;
  };
}
