'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Plus,
  Upload,
  MessageSquare,
  Loader2,
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
  evidencesCount: number;
  assigneeId: string | null;
}

interface SupportPlan {
  id: string;
  tenantId: string;
  foreignWorkerId: string;
  templateId: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Progress {
  total: number;
  done: number;
  percent: number;
}

// ==================== API Client ====================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
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

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

// ==================== Component ====================

export default function ForeignWorkerSupportPlanPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;

  const [plan, setPlan] = useState<SupportPlan | null>(null);
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [addingEvidence, setAddingEvidence] = useState(false);

  // Fetch support plan
  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest<{
        success: boolean;
        data: { supportPlan: SupportPlan | null; progress: Progress | null };
      }>(`/api/v2/workers/${workerId}/support-plan`);

      if (response.data.supportPlan) {
        setPlan(response.data.supportPlan);
        setProgress(response.data.progress);

        // Fetch tasks
        const tasksResponse = await apiRequest<{
          success: boolean;
          data: { tasks: SupportTask[] };
        }>(`/api/v2/support-plans/${response.data.supportPlan.id}/tasks`);

        setTasks(tasksResponse.data.tasks);
      } else {
        setPlan(null);
        setTasks([]);
        setProgress(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Create support plan
  const handleCreatePlan = async () => {
    try {
      setCreating(true);
      setError(null);

      await apiRequest('/api/v2/support-plans', {
        method: 'POST',
        body: JSON.stringify({
          foreignWorkerId: workerId,
          startDate: new Date().toISOString(),
        }),
      });

      // Refetch data
      await fetchPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : '支援計画の作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  // Complete task
  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTask(taskId);

      await apiRequest(`/api/v2/support-tasks/${taskId}/complete`, {
        method: 'POST',
      });

      // Refetch tasks
      if (plan) {
        const tasksResponse = await apiRequest<{
          success: boolean;
          data: { tasks: SupportTask[] };
        }>(`/api/v2/support-plans/${plan.id}/tasks`);
        setTasks(tasksResponse.data.tasks);

        // Update progress
        const doneCount = tasksResponse.data.tasks.filter((t) => t.status === 'done').length;
        const total = tasksResponse.data.tasks.length;
        setProgress({
          total,
          done: doneCount,
          percent: total > 0 ? Math.round((doneCount / total) * 100) : 0,
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'タスクの完了に失敗しました');
    } finally {
      setCompletingTask(null);
    }
  };

  // Add evidence
  const handleAddEvidence = async (taskId: string) => {
    if (!evidenceNote.trim()) return;

    try {
      setAddingEvidence(true);

      await apiRequest(`/api/v2/support-tasks/${taskId}/evidences`, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'note',
          note: evidenceNote,
        }),
      });

      // Refetch tasks to update evidence count
      if (plan) {
        const tasksResponse = await apiRequest<{
          success: boolean;
          data: { tasks: SupportTask[] };
        }>(`/api/v2/support-plans/${plan.id}/tasks`);
        setTasks(tasksResponse.data.tasks);
      }

      setEvidenceNote('');
      setShowEvidenceModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エビデンスの追加に失敗しました');
    } finally {
      setAddingEvidence(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Error state
  if (error && !plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.back()} className="btn btn-secondary">
            戻る
          </button>
        </div>
      </div>
    );
  }

  // No plan state - show create button
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">支援計画</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              支援計画がまだ作成されていません
            </h2>
            <p className="text-gray-500 mb-6">
              テンプレートから10項目の支援計画を作成します
            </p>
            <button
              onClick={handleCreatePlan}
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                '支援計画を作成'
              )}
            </button>
            {error && <p className="mt-4 text-red-500">{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  // Plan exists - show tasks
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
                開始日: {new Date(plan.startDate).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">進捗</p>
              <p className="text-2xl font-bold text-primary-600">
                {progress?.percent ?? 0}%
              </p>
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
              style={{ width: `${progress?.percent ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {progress?.total ?? 0}項目中 {progress?.done ?? 0}項目 完了
          </p>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.map((task) => {
            const typeInfo = TASK_TYPE_LABELS[task.type] || { ja: task.title, icon: '📋' };
            const isCompleted = task.status === 'done';
            const isInProgress = task.status === 'in_progress';

            return (
              <div
                key={task.id}
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
                    {task.description && (
                      <p className="text-sm text-gray-500">{task.description}</p>
                    )}

                    {/* Task Details */}
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-xs text-gray-500">
                            期限: {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                            {task.completedAt &&
                              ` / 完了: ${new Date(task.completedAt).toLocaleDateString('ja-JP')}`}
                          </p>
                        )}
                      </div>
                      <span className={`badge ${STATUS_STYLES[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      <div className="flex items-center gap-1">
                        {task.evidencesCount > 0 && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <FileText className="h-4 w-4" />
                            {task.evidencesCount}
                          </span>
                        )}
                        <button
                          onClick={() => setShowEvidenceModal(task.id)}
                          className="btn btn-ghost p-1"
                          title="エビデンスを追加"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {!isCompleted && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={completingTask === task.id}
                            className="btn btn-primary btn-sm"
                          >
                            {completingTask === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              '完了'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
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
                <button className="btn btn-secondary flex-1" disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  ファイル
                </button>
                <button className="btn btn-secondary flex-1" disabled>
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
                disabled={!evidenceNote.trim() || addingEvidence}
              >
                {addingEvidence ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '追加'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
