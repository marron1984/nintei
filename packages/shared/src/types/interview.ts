/**
 * 定期面談関連の型定義
 * 3か月に1回以上の面談を管理
 */

export interface Interview {
  id: string;
  tenantId: string;
  workerId: string;
  // 予定
  scheduledDate: Date;
  scheduledTime?: string;
  location?: string;
  locationType: LocationType;
  timezone: string;
  // 担当
  interviewerId: string;
  interpreterId?: string;
  // 実施
  actualDate?: Date;
  actualTime?: string;
  duration?: number; // 分
  conductedLanguage?: string;
  // 記録
  status: InterviewStatus;
  summary?: string;
  topics: InterviewTopic[];
  issues: InterviewIssue[];
  followUpRequired: boolean;
  followUpNotes?: string;
  // 添付
  attachments: string[];
  // メタ
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LocationType = 'in_person' | 'video' | 'phone';

export type InterviewStatus =
  | 'scheduled' // 予定
  | 'confirmed' // 確認済み
  | 'completed' // 完了
  | 'cancelled' // キャンセル
  | 'no_show' // 未出席
  | 'rescheduled'; // 再予定

export interface InterviewTopic {
  id: string;
  category: TopicCategory;
  title: string;
  content: string;
  workerResponse?: string;
}

export type TopicCategory =
  | 'work_conditions' // 労働条件
  | 'living_conditions' // 生活状況
  | 'health' // 健康
  | 'japanese_learning' // 日本語学習
  | 'community' // 地域交流
  | 'concerns' // 悩み・不安
  | 'other';

export interface InterviewIssue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolution?: string;
  resolvedAt?: Date;
}

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'escalated';

export interface InterviewSchedule {
  workerId: string;
  lastInterviewDate?: Date;
  nextDueDate: Date;
  frequency: number; // 月数
  status: ScheduleStatus;
}

export type ScheduleStatus = 'on_track' | 'due_soon' | 'overdue';

export interface CreateInterviewInput {
  workerId: string;
  scheduledDate: Date;
  scheduledTime?: string;
  location?: string;
  locationType: LocationType;
  timezone?: string;
  interviewerId: string;
  interpreterId?: string;
}

export interface RecordInterviewInput {
  interviewId: string;
  actualDate: Date;
  actualTime?: string;
  duration?: number;
  conductedLanguage: string;
  summary: string;
  topics: Omit<InterviewTopic, 'id'>[];
  issues?: Omit<InterviewIssue, 'id' | 'resolvedAt'>[];
  followUpRequired: boolean;
  followUpNotes?: string;
  attachments?: string[];
}
