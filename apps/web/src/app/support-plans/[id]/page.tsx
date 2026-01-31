'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Upload,
  FileText,
  User,
  ChevronDown,
  ChevronRight,
  Send,
  Check,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  consentRequired: boolean;
  consentObtainedAt?: string;
  consentMethod?: string;
  assignee: { id: string; name: string };
  evidence: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    category: string;
    uploadedAt: string;
  }>;
}

interface PlanItem {
  id: string;
  itemNumber: number;
  category: string;
  title: string;
  description: string;
  method?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  tasks: Task[];
}

interface SupportPlan {
  id: string;
  status: 'draft' | 'pending_approval' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  createdAt: string;
  approvedAt?: string;
  foreignWorker: {
    id: string;
    firstName: string;
    lastName: string;
    company: { id: string; name: string };
  };
  creator: { id: string; name: string };
  approver?: { id: string; name: string };
  template?: { id: string; name: string };
  items: PlanItem[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  pending_approval: '承認待ち',
  active: '実施中',
  completed: '完了',
  cancelled: 'キャンセル',
};

const ITEM_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Circle className="h-5 w-5 text-gray-400" />,
  in_progress: <Clock className="h-5 w-5 text-blue-500" />,
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  skipped: <Circle className="h-5 w-5 text-gray-300" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

const CATEGORY_NAMES: Record<string, string> = {
  pre_entry: '入国前',
  arrival: '出入国',
  living: '生活',
  japanese_learning: '日本語学習',
  consultation: '相談・苦情',
  community: '地域交流',
  career: 'キャリア',
  regular_interview: '定期面談',
};

export default function SupportPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddTaskModal, setShowAddTaskModal] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // Mock data for demonstration
        setPlan({
          id: params.id as string,
          status: 'active',
          startDate: '2024-07-01',
          endDate: '2025-06-30',
          createdAt: '2024-06-15',
          approvedAt: '2024-06-20',
          foreignWorker: {
            id: 'worker-1',
            firstName: 'Van A',
            lastName: 'Nguyen',
            company: { id: 'company-1', name: 'サンプル株式会社' },
          },
          creator: { id: 'user-1', name: '山田 太郎' },
          approver: { id: 'user-2', name: '鈴木 花子' },
          template: { id: 'template-1', name: '標準テンプレート' },
          items: [
            {
              id: 'item-1',
              itemNumber: 1,
              category: 'pre_entry',
              title: '事前ガイダンス',
              description: '事前ガイダンスの実施',
              method: 'オンライン',
              status: 'completed',
              tasks: [
                {
                  id: 'task-1',
                  title: '事前ガイダンス資料の送付',
                  dueDate: '2024-06-25',
                  completedAt: '2024-06-24',
                  status: 'completed',
                  priority: 'high',
                  consentRequired: true,
                  consentObtainedAt: '2024-06-24',
                  consentMethod: 'electronic',
                  assignee: { id: 'user-1', name: '山田 太郎' },
                  evidence: [
                    { id: 'e1', fileName: '同意書.pdf', fileUrl: '/files/e1.pdf', category: 'consent', uploadedAt: '2024-06-24' },
                  ],
                },
              ],
            },
            {
              id: 'item-2',
              itemNumber: 2,
              category: 'arrival',
              title: '出入国時の送迎',
              description: '空港等への送迎',
              status: 'completed',
              tasks: [
                {
                  id: 'task-2',
                  title: '空港送迎',
                  dueDate: '2024-07-01',
                  completedAt: '2024-07-01',
                  status: 'completed',
                  priority: 'high',
                  consentRequired: false,
                  assignee: { id: 'user-1', name: '山田 太郎' },
                  evidence: [
                    { id: 'e2', fileName: '送迎記録.pdf', fileUrl: '/files/e2.pdf', category: 'record', uploadedAt: '2024-07-01' },
                  ],
                },
              ],
            },
            {
              id: 'item-3',
              itemNumber: 3,
              category: 'living',
              title: '住居確保・生活必需品',
              description: '住居の確保と生活必需品の準備',
              status: 'completed',
              tasks: [],
            },
            {
              id: 'item-4',
              itemNumber: 4,
              category: 'living',
              title: '生活オリエンテーション',
              description: '生活に必要な情報の提供',
              status: 'in_progress',
              tasks: [
                {
                  id: 'task-4',
                  title: '生活オリエンテーション実施',
                  dueDate: '2024-07-15',
                  status: 'in_progress',
                  priority: 'medium',
                  consentRequired: false,
                  assignee: { id: 'user-1', name: '山田 太郎' },
                  evidence: [],
                },
              ],
            },
            {
              id: 'item-5',
              itemNumber: 5,
              category: 'living',
              title: '公的手続への同行',
              description: '市区町村等への届出への同行',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-6',
              itemNumber: 6,
              category: 'japanese_learning',
              title: '日本語学習機会の提供',
              description: '日本語学習の機会の提供',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-7',
              itemNumber: 7,
              category: 'consultation',
              title: '相談・苦情対応',
              description: '相談・苦情への対応',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-8',
              itemNumber: 8,
              category: 'community',
              title: '日本人との交流促進',
              description: '地域住民との交流の機会の提供',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-9',
              itemNumber: 9,
              category: 'career',
              title: '転職支援',
              description: '転職支援（会社都合離職の場合）',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-10',
              itemNumber: 10,
              category: 'regular_interview',
              title: '定期面談',
              description: '定期的な面談の実施',
              status: 'in_progress',
              tasks: [
                {
                  id: 'task-10-1',
                  title: '第1回定期面談',
                  dueDate: '2024-09-30',
                  status: 'pending',
                  priority: 'medium',
                  consentRequired: false,
                  assignee: { id: 'user-1', name: '山田 太郎' },
                  evidence: [],
                },
              ],
            },
          ],
        });
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [params.id]);

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getProgress = () => {
    if (!plan) return { completed: 0, total: 0, percentage: 0 };
    const completed = plan.items.filter((item) => item.status === 'completed').length;
    const total = plan.items.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">支援計画が見つかりません</div>
      </div>
    );
  }

  const progress = getProgress();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">支援計画</h1>
              <p className="text-sm text-gray-500">
                {plan.foreignWorker.lastName} {plan.foreignWorker.firstName} - {plan.foreignWorker.company.name}
              </p>
            </div>
            <span className={`badge ${STATUS_COLORS[plan.status]}`}>{STATUS_LABELS[plan.status]}</span>
            {plan.status === 'draft' && (
              <button className="btn btn-primary">
                <Send className="mr-2 h-4 w-4" />
                承認申請
              </button>
            )}
            {plan.status === 'pending_approval' && (
              <button className="btn btn-success">
                <Check className="mr-2 h-4 w-4" />
                承認
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress & Info */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">進捗状況</h2>
            <div className="mb-2 flex justify-between text-sm">
              <span>{progress.completed}/{progress.total} 項目完了</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>完了: {plan.items.filter((i) => i.status === 'completed').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>進行中: {plan.items.filter((i) => i.status === 'in_progress').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Circle className="h-4 w-4 text-gray-400" />
                <span>未着手: {plan.items.filter((i) => i.status === 'pending').length}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold">計画情報</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">期間</dt>
                <dd>{plan.startDate} 〜 {plan.endDate || '未定'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">作成者</dt>
                <dd>{plan.creator.name}</dd>
              </div>
              {plan.approver && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">承認者</dt>
                  <dd>{plan.approver.name}</dd>
                </div>
              )}
              {plan.template && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">テンプレート</dt>
                  <dd>{plan.template.name}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Support Items */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">支援項目（10項目）</h2>
          <div className="space-y-2">
            {plan.items.map((item) => (
              <div key={item.id} className="border rounded-lg">
                {/* Item Header */}
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"
                >
                  {expandedItems.has(item.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  {ITEM_STATUS_ICONS[item.status]}
                  <span className="w-8 text-sm text-gray-500">{item.itemNumber}.</span>
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <span className="badge badge-info">{CATEGORY_NAMES[item.category]}</span>
                  {item.tasks.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {item.tasks.filter((t) => t.status === 'completed').length}/{item.tasks.length} タスク
                    </span>
                  )}
                </button>

                {/* Item Content */}
                {expandedItems.has(item.id) && (
                  <div className="border-t bg-gray-50 p-4">
                    {item.method && (
                      <p className="mb-4 text-sm text-gray-600">
                        <span className="font-medium">実施方法:</span> {item.method}
                      </p>
                    )}

                    {/* Tasks */}
                    <div className="space-y-3">
                      {item.tasks.map((task) => (
                        <div key={task.id} className="rounded-lg bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {task.status === 'completed' ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                              ) : task.status === 'overdue' ? (
                                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                              ) : (
                                <Circle className="mt-0.5 h-5 w-5 text-gray-400" />
                              )}
                              <div>
                                <p className="font-medium">{task.title}</p>
                                {task.description && (
                                  <p className="text-sm text-gray-500">{task.description}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
                                    {task.priority === 'urgent' ? '緊急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                                  </span>
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <User className="h-3 w-3" />
                                    {task.assignee.name}
                                  </span>
                                  <span className="text-gray-500">期限: {task.dueDate}</span>
                                  {task.consentRequired && (
                                    <span className={`badge ${task.consentObtainedAt ? 'badge-success' : 'badge-warning'}`}>
                                      同意 {task.consentObtainedAt ? '取得済' : '要取得'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {task.status !== 'completed' && (
                                <button
                                  onClick={() => setShowUploadModal(task.id)}
                                  className="btn btn-sm btn-secondary"
                                >
                                  <Upload className="h-4 w-4" />
                                </button>
                              )}
                              {task.status !== 'completed' && !task.consentRequired && (
                                <button className="btn btn-sm btn-primary">完了</button>
                              )}
                              {task.status !== 'completed' && task.consentRequired && !task.consentObtainedAt && (
                                <button className="btn btn-sm btn-warning">同意取得</button>
                              )}
                              {task.status !== 'completed' && task.consentRequired && task.consentObtainedAt && (
                                <button className="btn btn-sm btn-primary">完了</button>
                              )}
                            </div>
                          </div>

                          {/* Evidence */}
                          {task.evidence.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <p className="mb-2 text-xs font-medium text-gray-500">証跡</p>
                              <div className="flex flex-wrap gap-2">
                                {task.evidence.map((e) => (
                                  <a
                                    key={e.id}
                                    href={e.fileUrl}
                                    className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {e.fileName}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {item.tasks.length === 0 && (
                        <p className="text-center text-sm text-gray-500">タスクがありません</p>
                      )}

                      <button
                        onClick={() => setShowAddTaskModal(item.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-primary-500 hover:text-primary-500"
                      >
                        <Plus className="h-4 w-4" />
                        タスクを追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
