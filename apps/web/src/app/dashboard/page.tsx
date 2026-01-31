'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  ClipboardList,
  MessageSquare,
  Calendar,
  FileText,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  activeWorkers: number;
  activeCompanies: number;
  pendingTasks: number;
  openConsultations: number;
  upcomingInterviews: number;
  overdueInterviews: number;
  expiringResidence: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In real app, fetch from API
    setTimeout(() => {
      setStats({
        activeWorkers: 156,
        activeCompanies: 23,
        pendingTasks: 42,
        openConsultations: 8,
        upcomingInterviews: 15,
        overdueInterviews: 3,
        expiringResidence: 5,
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
            <div className="flex items-center gap-4">
              <select className="input w-auto">
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
                <option value="zh">中文</option>
              </select>
              <span className="text-sm text-gray-600">管理者 太郎</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {stats && (stats.overdueInterviews > 0 || stats.expiringResidence > 0) && (
          <div className="mb-8 space-y-4">
            {stats.overdueInterviews > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span>
                  <strong>{stats.overdueInterviews}名</strong>の定期面談が期限超過しています
                </span>
                <Link href="/interviews/overdue" className="ml-auto text-sm underline">
                  確認する
                </Link>
              </div>
            )}
            {stats.expiringResidence > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span>
                  <strong>{stats.expiringResidence}名</strong>の在留期限が90日以内です
                </span>
                <Link href="/workers/expiring" className="ml-auto text-sm underline">
                  確認する
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/workers" className="card hover:border-primary-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">支援中の外国人</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeWorkers}</p>
              </div>
            </div>
          </Link>

          <Link href="/companies" className="card hover:border-primary-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-100 p-3">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">受入企業</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeCompanies}</p>
              </div>
            </div>
          </Link>

          <Link href="/tasks" className="card hover:border-primary-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-100 p-3">
                <ClipboardList className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">未完了タスク</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingTasks}</p>
              </div>
            </div>
          </Link>

          <Link href="/consultations" className="card hover:border-primary-500 transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-100 p-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">対応中の相談</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.openConsultations}</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">クイックアクション</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/workers/new"
              className="btn btn-secondary justify-start gap-2 py-3"
            >
              <Users className="h-4 w-4" />
              外国人を登録
            </Link>
            <Link
              href="/interviews/new"
              className="btn btn-secondary justify-start gap-2 py-3"
            >
              <Calendar className="h-4 w-4" />
              面談を予約
            </Link>
            <Link
              href="/consultations/new"
              className="btn btn-secondary justify-start gap-2 py-3"
            >
              <MessageSquare className="h-4 w-4" />
              相談を受付
            </Link>
            <Link
              href="/documents/new"
              className="btn btn-secondary justify-start gap-2 py-3"
            >
              <FileText className="h-4 w-4" />
              書類を作成
            </Link>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Upcoming Interviews */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">今後の面談予定</h2>
              <Link href="/interviews" className="text-sm text-primary-600 hover:underline">
                すべて見る
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Nguyen Van A', date: '2024/12/15 10:00', company: 'サンプル株式会社' },
                { name: 'Tran Thi B', date: '2024/12/15 14:00', company: 'テスト工業' },
                { name: 'Le Van C', date: '2024/12/16 11:00', company: 'サンプル株式会社' },
              ].map((interview, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{interview.name}</p>
                    <p className="text-sm text-gray-500">{interview.company}</p>
                  </div>
                  <div className="text-sm text-gray-600">{interview.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Consultations */}
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">最近の相談</h2>
              <Link href="/consultations" className="text-sm text-primary-600 hover:underline">
                すべて見る
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { subject: '労働条件について', priority: 'high', status: '対応中' },
                { subject: '住居の問題', priority: 'medium', status: '受付' },
                { subject: '日本語学習の相談', priority: 'low', status: '対応中' },
              ].map((consultation, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      consultation.priority === 'high' ? 'badge-danger' :
                      consultation.priority === 'medium' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {consultation.priority === 'high' ? '高' :
                       consultation.priority === 'medium' ? '中' : '低'}
                    </span>
                    <span className="font-medium text-gray-900">{consultation.subject}</span>
                  </div>
                  <span className="badge badge-info">{consultation.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
