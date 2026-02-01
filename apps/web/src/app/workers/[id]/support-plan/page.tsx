'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Upload,
} from 'lucide-react';

// ==================== Types ====================

interface SupportTask {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  dueDate: string | null;
  completedAt: string | null;
  evidenceCount: number;
}

interface SupportPlanItem {
  id: string;
  itemNumber: number;
  type: string;
  title: string;
  description: string;
  status: string;
  tasks: SupportTask[];
}

interface SupportPlan {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  foreignWorker: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items: SupportPlanItem[];
}

// ==================== Constants ====================

const TASK_TYPE_LABELS: Record<string, { ja: string; icon: string }> = {
  pre_entry_guidance: { ja: '事前ガイダンス', icon: '1️⃣' },
  airport_pickup: { ja: '出入国時の送迎', icon: '2️⃣' },
  housing_support: { ja: '住居確保・生活契約支援', icon: '3️⃣' },
  life_orientation: { ja: '生活オリエンテーション', icon: '4️⃣' },
  official_procedures: { ja: '公的手続等への同行', icon: '5️⃣' },
  japanese_learning: { ja: '日本語学習の機会の提供', icon: '6️⃣' },
  consultation_complaints: { ja: '相談・苦情への対応', icon: '7️⃣' },
  japanese_community: { ja: '日本人との交流促進', icon: '8️⃣' },
  job_change_support: { ja: '転職支援', icon: '9️⃣' },
  regular_interviews: { ja: '定期的な面談', icon: '🔟' },
};

const STATUS_STYLES = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const STATUS_LABELS = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

// ==================== Component ====================

export default function ForeignWorkerSupportPlanPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // In real app, fetch from API
        // const response = await api.get(`/api/v2/support-plans?foreignWorkerId=${params.id}`);
        // setPlan(response.data);

        // Mock data for demonstration
        setPlan({
          id: 'plan-1',
          status: 'active',
          startDate: '2024-07-01',
          endDate: null,
          foreignWorker: {
            id: params.id as string,
            firstName: 'Van A',
            lastName: 'Nguyen',
          },
          items: [
            {
              id: 'item-1',
              itemNumber: 1,
              type: 'pre_entry_guidance',
              title: '事前ガイダンス',
              description: '入国前に必要な情報を提供',
              status: 'completed',
              tasks: [
                {
                  id: 'task-1',
                  type: 'pre_entry_guidance',
                  title: '事前ガイダンス実施',
                  description: '入国前のオリエンテーション',
                  status: 'done',
                  dueDate: '2024-06-24',
                  completedAt: '2024-06-23',
                  evidenceCount: 2,
                },
              ],
            },
            {
              id: 'item-2',
              itemNumber: 2,
              type: 'airport_pickup',
              title: '出入国時の送迎',
              description: '空港等への送迎',
              status: 'completed',
              tasks: [
                {
                  id: 'task-2',
                  type: 'airport_pickup',
                  title: '空港送迎',
                  description: '成田空港にて出迎え',
                  status: 'done',
                  dueDate: '2024-07-01',
                  completedAt: '2024-07-01',
                  evidenceCount: 1,
                },
              ],
            },
            {
              id: 'item-3',
              itemNumber: 3,
              type: 'housing_support',
              title: '住居確保・生活契約支援',
              description: '住居の確保と生活必需品契約の支援',
              status: 'in_progress',
              tasks: [
                {
                  id: 'task-3',
                  type: 'housing_support',
                  title: '住居契約支援',
                  description: '賃貸契約への同行・支援',
                  status: 'in_progress',
                  dueDate: '2024-07-08',
                  completedAt: null,
                  evidenceCount: 0,
                },
              ],
            },
            {
              id: 'item-4',
              itemNumber: 4,
              type: 'life_orientation',
              title: '生活オリエンテーション',
              description: '生活ルールや習慣の説明',
              status: 'pending',
              tasks: [
                {
                  id: 'task-4',
                  type: 'life_orientation',
                  title: '生活オリエンテーション実施',
                  description: 'ゴミ出しルール、交通ルール等の説明',
                  status: 'todo',
                  dueDate: '2024-07-15',
                  completedAt: null,
                  evidenceCount: 0,
                },
              ],
            },
            {
              id: 'item-5',
              itemNumber: 5,
              type: 'official_procedures',
              title: '公的手続等への同行',
              description: '市区町村役場等への届出への同行',
              status: 'pending',
              tasks: [
                {
                  id: 'task-5',
                  type: 'official_procedures',
                  title: '住民登録同行',
                  description: '区役所での住民登録手続きへの同行',
                  status: 'todo',
                  dueDate: '2024-07-10',
                  completedAt: null,
                  evidenceCount: 0,
                },
              ],
            },
            {
              id: 'item-6',
              itemNumber: 6,
              type: 'japanese_learning',
              title: '日本語学習の機会の提供',
              description: '日本語教室等の情報提供',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-7',
              itemNumber: 7,
              type: 'consultation_complaints',
              title: '相談・苦情への対応',
              description: '相談窓口の案内と対応体制の説明',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-8',
              itemNumber: 8,
              type: 'japanese_community',
              title: '日本人との交流促進',
              description: '地域コミュニティ活動の紹介',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-9',
              itemNumber: 9,
              type: 'job_change_support',
              title: '転職支援',
              description: '非自発的離職時の転職支援',
              status: 'pending',
              tasks: [],
            },
            {
              id: 'item-10',
              itemNumber: 10,
              type: 'regular_interviews',
              title: '定期的な面談',
              description: '3か月ごとの定期面談',
              status: 'pending',
              tasks: [],
            },
          ],
        });
        setLoading(false);
      } catch (err) {
        setError('データの取得に失敗しました');
        setLoading(false);
      }
    };

    fetchPlan();
  }, [params.id]);

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTask(taskId);
    try {
      // In real app, call API
      // await api.post(`/api/v2/support-tasks/${taskId}/complete`);

      // Update local state
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => ({
            ...item,
            tasks: item.tasks.map((task) =>
              task.id === taskId
                ? { ...task, status: 'done' as const, completedAt: new Date().toISOString() }
                : task
            ),
          })),
        };
      });
    } catch (err) {
      alert('タスクの完了に失敗しました');
    } finally {
      setCompletingTask(null);
    }
  };

  const handleAddEvidence = async (taskId: string) => {
    if (!evidenceNote.trim()) return;

    try {
      // In real app, call API
      // await api.post(`/api/v2/support-tasks/${taskId}/evidences`, {
      //   kind: 'note',
      //   note: evidenceNote,
      // });

      // Update local state
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => ({
            ...item,
            tasks: item.tasks.map((task) =>
              task.id === taskId ? { ...task, evidenceCount: task.evidenceCount + 1 } : task
            ),
          })),
        };
      });

      setEvidenceNote('');
      setShowEvidenceModal(null);
    } catch (err) {
      alert('エビデンスの追加に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '支援計画が見つかりません'}</p>
          <button onClick={() => router.back()} className="btn btn-secondary">
            戻る
          </button>
        </div>
      </div>
    );
  }

  const completedCount = plan.items.filter((item) =>
    item.tasks.every((task) => task.status === 'done')
  ).length;
  const progressPercent = Math.round((completedCount / 10) * 100);

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
                {plan.foreignWorker.lastName} {plan.foreignWorker.firstName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">進捗</p>
              <p className="text-2xl font-bold text-primary-600">{progressPercent}%</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            10項目中 {completedCount}項目 完了
          </p>
        </div>

        {/* Support Plan Items */}
        <div className="space-y-4">
          {plan.items.map((item) => {
            const typeInfo = TASK_TYPE_LABELS[item.type] || { ja: item.title, icon: '📋' };
            const isCompleted = item.tasks.length > 0 && item.tasks.every((t) => t.status === 'done');
            const isInProgress = item.tasks.some((t) => t.status === 'in_progress');

            return (
              <div
                key={item.id}
                className={`card ${isCompleted ? 'border-green-200 bg-green-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{typeInfo.ja}</h3>
                      {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {isInProgress && <Clock className="h-5 w-5 text-blue-500" />}
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>

                    {/* Tasks */}
                    {item.tasks.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {item.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm"
                          >
                            {task.status === 'done' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              {task.dueDate && (
                                <p className="text-xs text-gray-500">
                                  期限: {task.dueDate}
                                  {task.completedAt && ` / 完了: ${task.completedAt.split('T')[0]}`}
                                </p>
                              )}
                            </div>
                            <span className={`badge ${STATUS_STYLES[task.status]}`}>
                              {STATUS_LABELS[task.status]}
                            </span>
                            <div className="flex items-center gap-1">
                              {task.evidenceCount > 0 && (
                                <span className="flex items-center gap-1 text-sm text-gray-500">
                                  <FileText className="h-4 w-4" />
                                  {task.evidenceCount}
                                </span>
                              )}
                              <button
                                onClick={() => setShowEvidenceModal(task.id)}
                                className="btn btn-ghost p-1"
                                title="エビデンスを追加"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              {task.status !== 'done' && (
                                <button
                                  onClick={() => handleCompleteTask(task.id)}
                                  disabled={completingTask === task.id}
                                  className="btn btn-primary btn-sm"
                                >
                                  {completingTask === task.id ? '処理中...' : '完了'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.tasks.length === 0 && (
                      <p className="mt-2 text-sm text-gray-400">タスクなし</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">エビデンスを追加</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">メモ</label>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  className="w-full rounded-lg border p-3"
                  rows={4}
                  placeholder="実施内容や確認事項を記録..."
                />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1">
                  <Upload className="mr-2 h-4 w-4" />
                  ファイル
                </button>
                <button className="btn btn-secondary flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  URL
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEvidenceModal(null);
                  setEvidenceNote('');
                }}
                className="btn btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleAddEvidence(showEvidenceModal)}
                className="btn btn-primary"
                disabled={!evidenceNote.trim()}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
