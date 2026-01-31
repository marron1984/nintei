/**
 * 相談・苦情関連の型定義
 */

export interface Consultation {
  id: string;
  tenantId: string;
  workerId: string;
  companyId: string;
  // 受付情報
  category: ConsultationCategory;
  subject: string;
  description: string;
  receivedAt: Date;
  receivedBy: string;
  receivedMethod: ReceivedMethod;
  // 言語
  language: string;
  interpreterId?: string;
  interpreterNotes?: string;
  // ステータス
  status: ConsultationStatus;
  priority: ConsultationPriority;
  // 対応
  assigneeId?: string;
  dueDate?: Date;
  // クローズ
  resolution?: string;
  closedAt?: Date;
  closedBy?: string;
  // 添付
  attachments: string[];
  // メタ
  createdAt: Date;
  updatedAt: Date;
}

export type ConsultationCategory =
  | 'work_conditions' // 労働条件
  | 'harassment' // ハラスメント
  | 'wage' // 賃金
  | 'living' // 生活
  | 'health' // 健康
  | 'visa' // ビザ・在留
  | 'family' // 家族
  | 'other';

export type ReceivedMethod = 'phone' | 'email' | 'in_person' | 'app' | 'other';

export type ConsultationStatus =
  | 'received' // 受付
  | 'in_progress' // 対応中
  | 'pending_response' // 回答待ち
  | 'resolved' // 解決
  | 'closed' // クローズ
  | 'escalated'; // エスカレーション

export type ConsultationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ConsultationResponse {
  id: string;
  consultationId: string;
  responderId: string;
  content: string;
  language: string;
  attachments: string[];
  createdAt: Date;
}

export interface ConsultationEscalation {
  id: string;
  consultationId: string;
  escalatedBy: string;
  escalatedTo: string;
  reason: string;
  createdAt: Date;
}

export interface CreateConsultationInput {
  workerId: string;
  companyId: string;
  category: ConsultationCategory;
  subject: string;
  description: string;
  receivedMethod: ReceivedMethod;
  language: string;
  interpreterId?: string;
  priority?: ConsultationPriority;
  attachments?: string[];
}

export interface RespondToConsultationInput {
  consultationId: string;
  content: string;
  language: string;
  attachments?: string[];
}

export interface CloseConsultationInput {
  consultationId: string;
  resolution: string;
}
