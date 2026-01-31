/**
 * 書類生成・管理関連の型定義
 */

export interface DocumentTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  type: DocumentType;
  // テンプレート
  content: string; // HTML/Mustacheテンプレート
  contentTranslations: Record<string, string>; // 言語別テンプレート
  variables: TemplateVariable[];
  // バージョン管理
  version: number;
  status: TemplateStatus;
  approvedBy?: string;
  approvedAt?: Date;
  // 法定文言
  isLegalDocument: boolean;
  legalTextVersion?: string;
  // メタ
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentCategory =
  | 'support_plan' // 支援計画
  | 'employment' // 雇用関連
  | 'immigration' // 入管関連
  | 'interview' // 面談記録
  | 'consultation' // 相談記録
  | 'notification' // 届出
  | 'other';

export type DocumentType = 'pdf' | 'excel' | 'word';
export type TemplateStatus = 'draft' | 'active' | 'archived';

export interface TemplateVariable {
  key: string;
  label: string;
  type: VariableType;
  required: boolean;
  defaultValue?: string;
  source?: VariableSource;
}

export type VariableType = 'text' | 'date' | 'number' | 'boolean' | 'list';
export type VariableSource = 'worker' | 'company' | 'tenant' | 'user' | 'custom';

export interface Document {
  id: string;
  tenantId: string;
  templateId: string;
  workerId?: string;
  companyId?: string;
  // 内容
  title: string;
  language: string;
  variables: Record<string, unknown>;
  // 生成
  generatedFileUrl?: string;
  generatedAt?: Date;
  // 版管理
  version: number;
  versionType: VersionType;
  parentVersionId?: string;
  // 不備チェック
  validationStatus: ValidationStatus;
  validationErrors: ValidationError[];
  // 承認
  status: DocumentStatus;
  approvedBy?: string;
  approvedAt?: Date;
  // 提出
  submittedAt?: Date;
  submittedBy?: string;
  // メタ
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VersionType = 'original' | 'revision' | 'resubmission';
export type ValidationStatus = 'pending' | 'valid' | 'invalid';
export type DocumentStatus =
  | 'draft' // 下書き
  | 'pending_review' // レビュー待ち
  | 'pending_approval' // 承認待ち
  | 'approved' // 承認済み
  | 'rejected' // 却下
  | 'submitted' // 提出済み
  | 'returned'; // 差戻し

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CreateDocumentInput {
  templateId: string;
  workerId?: string;
  companyId?: string;
  title: string;
  language: string;
  variables: Record<string, unknown>;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  versionType: VersionType;
  fileUrl: string;
  changes?: string;
  createdBy: string;
  createdAt: Date;
}
