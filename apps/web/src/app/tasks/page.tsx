'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  List,
  Columns,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  User,
  Filter,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: { id: string; name: string };
  foreignWorker: { id: string; firstName: string; lastName: string };
  supportPlan: { id: string };
  planItem: { title: string };
}

interface Interview {
  id: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  foreignWorker: { id: string; firstName: string; lastName: string };
  locationType: string;
}

type ViewMode = 'kanban' | 'list' | 'calendar';

const STATUS_COLUMNS = [
  { id: 'pending', label: '未着手', color: 'bg-gray-100' },
  { id: 'in_progress', label: '進行中', color: 'bg-blue-100' },
  { id: 'completed', label: '完了', color: 'bg-green-100' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  useEffect(() => {
    // Mock data
    setTasks([
      {
        id: 'task-1',
        title: '生活オリエンテーション実施',
        dueDate: '2024-12-20',
        status: 'in_progress',
        priority: 'medium',
        assignee: { id: 'user-1', name: '山田 太郎' },
        foreignWorker: { id: 'worker-1', firstName: 'Van A', lastName: 'Nguyen' },
        supportPlan: { id: 'plan-1' },
        planItem: { title: '生活オリエンテーション' },
      },
      {
        id: 'task-2',
        title: '公的手続き同行（転入届）',
        dueDate: '2024-12-18',
        status: 'pending',
        priority: 'high',
        assignee: { id: 'user-1', name: '山田 太郎' },
        foreignWorker: { id: 'worker-1', firstName: 'Van A', lastName: 'Nguyen' },
        supportPlan: { id: 'plan-1' },
        planItem: { title: '公的手続への同行' },
      },
      {
        id: 'task-3',
        title: '第1回定期面談',
        dueDate: '2024-12-25',
        status: 'pending',
        priority: 'medium',
        assignee: { id: 'user-1', name: '山田 太郎' },
        foreignWorker: { id: 'worker-2', firstName: 'Thi B', lastName: 'Tran' },
        supportPlan: { id: 'plan-2' },
        planItem: { title: '定期面談' },
      },
      {
        id: 'task-4',
        title: '事前ガイダンス実施',
        dueDate: '2024-12-15',
        status: 'overdue',
        priority: 'urgent',
        assignee: { id: 'user-2', name: '鈴木 花子' },
        foreignWorker: { id: 'worker-3', firstName: 'Van C', lastName: 'Le' },
        supportPlan: { id: 'plan-3' },
        planItem: { title: '事前ガイダンス' },
      },
      {
        id: 'task-5',
        title: '空港送迎',
        dueDate: '2024-12-10',
        status: 'completed',
        priority: 'high',
        assignee: { id: 'user-1', name: '山田 太郎' },
        foreignWorker: { id: 'worker-4', firstName: 'Van D', lastName: 'Pham' },
        supportPlan: { id: 'plan-4' },
        planItem: { title: '出入国時の送迎' },
      },
    ]);

    setInterviews([
      {
        id: 'int-1',
        scheduledDate: '2024-12-20',
        scheduledTime: '10:00',
        status: 'scheduled',
        foreignWorker: { id: 'worker-1', firstName: 'Van A', lastName: 'Nguyen' },
        locationType: 'in_person',
      },
      {
        id: 'int-2',
        scheduledDate: '2024-12-22',
        scheduledTime: '14:00',
        status: 'scheduled',
        foreignWorker: { id: 'worker-2', firstName: 'Thi B', lastName: 'Tran' },
        locationType: 'video',
      },
    ]);

    setLoading(false);
  }, []);

  const getTasksByStatus = (status: string) => {
    let filtered = tasks.filter((t) => t.status === status || (status === 'pending' && t.status === 'overdue'));
    if (filterAssignee !== 'all') {
      filtered = filtered.filter((t) => t.assignee.id === filterAssignee);
    }
    return filtered;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding for first week
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add padding for last week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
    const dayInterviews = interviews.filter((i) => i.scheduledDate === dateStr);
    return { tasks: dayTasks, interviews: dayInterviews };
  };

  const navigateMonth = (delta: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const overdueTasks = tasks.filter((t) => t.status === 'overdue');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">タスク管理</h1>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border bg-white">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm ${viewMode === 'kanban' ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
                >
                  <Columns className="h-4 w-4" />
                  カンバン
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
                >
                  <List className="h-4 w-4" />
                  リスト
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
                >
                  <Calendar className="h-4 w-4" />
                  カレンダー
                </button>
              </div>
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="input w-auto text-sm"
                >
                  <option value="all">全担当者</option>
                  <option value="user-1">山田 太郎</option>
                  <option value="user-2">鈴木 花子</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {overdueTasks.length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span>
              <strong>{overdueTasks.length}件</strong>のタスクが期限超過しています
            </span>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {STATUS_COLUMNS.map((column) => (
              <div key={column.id} className={`rounded-lg ${column.color} p-4`}>
                <h2 className="mb-4 flex items-center justify-between font-semibold">
                  {column.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-sm">
                    {getTasksByStatus(column.id).length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {getTasksByStatus(column.id).map((task) => (
                    <Link
                      key={task.id}
                      href={`/support-plans/${task.supportPlan.id}`}
                      className={`block rounded-lg border-l-4 bg-white p-4 shadow-sm hover:shadow-md ${PRIORITY_COLORS[task.priority]}`}
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{task.planItem.title}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <User className="h-3 w-3" />
                          {task.foreignWorker.lastName} {task.foreignWorker.firstName}
                        </span>
                        <span className={`${task.status === 'overdue' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {task.status === 'overdue' && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                          {task.dueDate}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        担当: {task.assignee.name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="card">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">状態</th>
                  <th className="pb-3 font-medium">タスク</th>
                  <th className="pb-3 font-medium">対象者</th>
                  <th className="pb-3 font-medium">担当者</th>
                  <th className="pb-3 font-medium">期限</th>
                  <th className="pb-3 font-medium">優先度</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0">
                    <td className="py-3">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="h-5 w-5 text-blue-500" />
                      ) : task.status === 'overdue' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </td>
                    <td className="py-3">
                      <Link href={`/support-plans/${task.supportPlan.id}`} className="hover:text-primary-600">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-500">{task.planItem.title}</p>
                      </Link>
                    </td>
                    <td className="py-3">
                      <Link href={`/workers/${task.foreignWorker.id}`} className="text-primary-600 hover:underline">
                        {task.foreignWorker.lastName} {task.foreignWorker.firstName}
                      </Link>
                    </td>
                    <td className="py-3 text-sm">{task.assignee.name}</td>
                    <td className={`py-3 text-sm ${task.status === 'overdue' ? 'font-medium text-red-500' : ''}`}>
                      {task.dueDate}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${
                        task.priority === 'urgent' ? 'badge-danger' :
                        task.priority === 'high' ? 'badge-warning' :
                        task.priority === 'medium' ? 'badge-info' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.priority === 'urgent' ? '緊急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="card">
            {/* Calendar Header */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* Header */}
              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}

              {/* Days */}
              {getDaysInMonth(selectedDate).map((date, i) => {
                const { tasks: dayTasks, interviews: dayInterviews } = getItemsForDate(date);
                const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                const isToday = formatDate(date) === formatDate(new Date());

                return (
                  <div
                    key={i}
                    className={`min-h-24 bg-white p-2 ${!isCurrentMonth ? 'text-gray-300' : ''} ${isToday ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                  >
                    <p className={`mb-1 text-sm ${isToday ? 'font-bold text-primary-600' : ''}`}>
                      {date.getDate()}
                    </p>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className={`truncate rounded px-1 py-0.5 text-xs ${
                            task.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayInterviews.slice(0, 2).map((interview) => (
                        <div
                          key={interview.id}
                          className="truncate rounded bg-purple-100 px-1 py-0.5 text-xs text-purple-700"
                        >
                          面談: {interview.foreignWorker.lastName}
                        </div>
                      ))}
                      {(dayTasks.length + dayInterviews.length > 2) && (
                        <p className="text-xs text-gray-500">
                          +{dayTasks.length + dayInterviews.length - 2} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
