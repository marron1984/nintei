/**
 * 外国人（支援対象者）関連の型定義
 */

import type { Address } from './tenant.js';

export interface Worker {
  id: string;
  tenantId: string;
  companyId: string;
  officeId?: string;
  siteId?: string;
  // 基本情報
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  firstNameNative?: string; // 母語表記
  lastNameNative?: string;
  dateOfBirth: Date;
  gender: Gender;
  nationality: string;
  // 連絡先
  email?: string;
  phone: string;
  address: Address;
  emergencyContact?: EmergencyContact;
  // 言語
  nativeLanguage: string; // 母語
  understandsLanguages: string[]; // 理解できる言語
  japaneseLevel?: JapaneseLevel;
  // 在留関連
  residenceCard: ResidenceCard;
  // 雇用関連
  employment: Employment;
  // ステータス
  status: WorkerStatus;
  supportStartDate: Date;
  supportEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type Gender = 'male' | 'female' | 'other';

export type WorkerStatus =
  | 'active' // 支援中
  | 'completed' // 支援完了
  | 'suspended' // 一時停止
  | 'terminated'; // 終了

export type JapaneseLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'none';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  address?: string;
}

export interface ResidenceCard {
  number: string;
  status: ResidenceStatus; // 在留資格
  period: string; // 在留期間
  expiryDate: Date; // 在留期限
  issueDate: Date;
}

export type ResidenceStatus =
  | 'specified_skilled_1' // 特定技能1号
  | 'specified_skilled_2' // 特定技能2号
  | 'technical_intern_1' // 技能実習1号
  | 'technical_intern_2' // 技能実習2号
  | 'technical_intern_3' // 技能実習3号
  | 'other';

export interface Employment {
  contractStartDate: Date;
  contractEndDate?: Date;
  jobCategory: string; // 業種
  occupation: string; // 職種
  salary: number;
  salaryType: 'monthly' | 'hourly';
  workingHoursPerWeek: number;
}

export interface CreateWorkerInput {
  companyId: string;
  officeId?: string;
  siteId?: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  firstNameNative?: string;
  lastNameNative?: string;
  dateOfBirth: Date;
  gender: Gender;
  nationality: string;
  phone: string;
  email?: string;
  address: Address;
  nativeLanguage: string;
  understandsLanguages: string[];
  japaneseLevel?: JapaneseLevel;
  residenceCard: ResidenceCard;
  employment: Employment;
  supportStartDate: Date;
}

export interface WorkerAlert {
  id: string;
  workerId: string;
  type: AlertType;
  message: string;
  dueDate: Date;
  status: AlertStatus;
  createdAt: Date;
}

export type AlertType =
  | 'residence_expiry' // 在留期限
  | 'contract_expiry' // 契約期限
  | 'interview_due' // 面談期限
  | 'document_due' // 届出期限
  | 'custom';

export type AlertStatus = 'pending' | 'acknowledged' | 'resolved';
