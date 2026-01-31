'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Languages,
  AlertTriangle,
  FileText,
  ClipboardList,
  MessageSquare,
  Edit,
} from 'lucide-react';

interface ForeignWorker {
  id: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  firstNameNative?: string;
  lastNameNative?: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  email?: string;
  phone: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  street?: string;
  building?: string;
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  nativeLanguage: string;
  understandsLanguages: string[];
  japaneseLevel?: string;
  residenceCardNumber: string;
  residenceStatus: string;
  residencePeriod: string;
  residenceExpiry: string;
  residenceIssueDate: string;
  status: string;
  supportStartDate: string;
  supportEndDate?: string;
  company: {
    id: string;
    name: string;
  };
  office?: {
    id: string;
    name: string;
  };
  employmentContracts: Array<{
    id: string;
    startDate: string;
    endDate?: string;
    jobCategory: string;
    occupation: string;
    salary: number;
    salaryType: string;
    status: string;
  }>;
  _count: {
    supportPlans: number;
    interviews: number;
    consultations: number;
    documentInstances: number;
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  vi: 'Tiếng Việt',
  zh: '中文',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
  my: 'မြန်မာ',
  ne: 'नेपाली',
  tl: 'Tagalog',
};

const NATIONALITY_NAMES: Record<string, string> = {
  VN: 'ベトナム',
  CN: '中国',
  PH: 'フィリピン',
  ID: 'インドネシア',
  TH: 'タイ',
  MM: 'ミャンマー',
  NP: 'ネパール',
  KH: 'カンボジア',
  LK: 'スリランカ',
  BD: 'バングラデシュ',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  active: '支援中',
  completed: '完了',
  suspended: '中断',
  terminated: '終了',
};

export default function ForeignWorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [worker, setWorker] = useState<ForeignWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        // In real app, fetch from API
        // const response = await api.get(`/api/foreign-workers/${params.id}`);
        // setWorker(response.data);

        // Mock data for demonstration
        setWorker({
          id: params.id as string,
          firstName: 'Van A',
          lastName: 'Nguyen',
          firstNameKana: 'ヴァン アー',
          lastNameKana: 'グエン',
          firstNameNative: 'Văn A',
          lastNameNative: 'Nguyễn',
          dateOfBirth: '1995-03-15',
          gender: 'male',
          nationality: 'VN',
          email: 'nguyen.vana@example.com',
          phone: '090-1234-5678',
          postalCode: '150-0001',
          prefecture: '東京都',
          city: '渋谷区',
          street: '神宮前1-1-1',
          building: 'ABCマンション101',
          emergencyName: 'Nguyen Thi B',
          emergencyRelation: '配偶者',
          emergencyPhone: '090-8765-4321',
          nativeLanguage: 'vi',
          understandsLanguages: ['vi', 'ja', 'en'],
          japaneseLevel: 'N3',
          residenceCardNumber: 'AB12345678CD',
          residenceStatus: '特定技能1号',
          residencePeriod: '1年',
          residenceExpiry: '2025-06-30',
          residenceIssueDate: '2024-07-01',
          status: 'active',
          supportStartDate: '2024-07-01',
          company: {
            id: 'company-1',
            name: 'サンプル株式会社',
          },
          office: {
            id: 'office-1',
            name: '東京本社',
          },
          employmentContracts: [
            {
              id: 'contract-1',
              startDate: '2024-07-01',
              endDate: '2025-06-30',
              jobCategory: '製造業',
              occupation: '機械加工',
              salary: 220000,
              salaryType: 'monthly',
              status: 'active',
            },
          ],
          _count: {
            supportPlans: 1,
            interviews: 4,
            consultations: 2,
            documentInstances: 8,
          },
        });
        setLoading(false);
      } catch (err) {
        setError('データの取得に失敗しました');
        setLoading(false);
      }
    };

    fetchWorker();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-500">{error || '外国人が見つかりません'}</div>
      </div>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(worker.residenceExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringWarning = daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {worker.lastName} {worker.firstName}
              </h1>
              {worker.lastNameKana && worker.firstNameKana && (
                <p className="text-sm text-gray-500">
                  {worker.lastNameKana} {worker.firstNameKana}
                </p>
              )}
            </div>
            <span className={`badge ${STATUS_COLORS[worker.status]}`}>
              {STATUS_LABELS[worker.status]}
            </span>
            <button className="btn btn-primary">
              <Edit className="mr-2 h-4 w-4" />
              編集
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {(isExpiringWarning || isExpired) && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${
              isExpired ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
            <span>
              {isExpired
                ? '在留期限が切れています'
                : `在留期限まで残り ${daysUntilExpiry} 日です`}
            </span>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Link href={`/workers/${worker.id}/support-plans`} className="card hover:border-primary-500">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">支援計画</p>
                <p className="text-2xl font-bold">{worker._count.supportPlans}</p>
              </div>
            </div>
          </Link>
          <Link href={`/workers/${worker.id}/interviews`} className="card hover:border-primary-500">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">面談</p>
                <p className="text-2xl font-bold">{worker._count.interviews}</p>
              </div>
            </div>
          </Link>
          <Link href={`/workers/${worker.id}/consultations`} className="card hover:border-primary-500">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">相談</p>
                <p className="text-2xl font-bold">{worker._count.consultations}</p>
              </div>
            </div>
          </Link>
          <Link href={`/workers/${worker.id}/documents`} className="card hover:border-primary-500">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">書類</p>
                <p className="text-2xl font-bold">{worker._count.documentInstances}</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">基本情報</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-gray-500">氏名（母語）</dt>
                  <dd className="font-medium">
                    {worker.lastNameNative} {worker.firstNameNative}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">生年月日</dt>
                  <dd className="font-medium">{worker.dateOfBirth}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">性別</dt>
                  <dd className="font-medium">
                    {worker.gender === 'male' ? '男性' : worker.gender === 'female' ? '女性' : 'その他'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">国籍</dt>
                  <dd className="font-medium">
                    {NATIONALITY_NAMES[worker.nationality] || worker.nationality}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Contact Info */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">連絡先</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-sm text-gray-500">電話番号</dt>
                    <dd className="font-medium">{worker.phone}</dd>
                  </div>
                </div>
                {worker.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <dt className="text-sm text-gray-500">メールアドレス</dt>
                      <dd className="font-medium">{worker.email}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-sm text-gray-500">住所</dt>
                    <dd className="font-medium">
                      〒{worker.postalCode} {worker.prefecture}
                      {worker.city}
                      {worker.street} {worker.building}
                    </dd>
                  </div>
                </div>
              </dl>
              {worker.emergencyName && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="mb-2 text-sm font-medium text-gray-700">緊急連絡先</h3>
                  <p className="text-sm">
                    {worker.emergencyName}（{worker.emergencyRelation}）{worker.emergencyPhone}
                  </p>
                </div>
              )}
            </div>

            {/* Residence Info */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">在留情報</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-sm text-gray-500">在留カード番号</dt>
                    <dd className="font-medium">{worker.residenceCardNumber}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">在留資格</dt>
                  <dd className="font-medium">{worker.residenceStatus}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">在留期間</dt>
                  <dd className="font-medium">{worker.residencePeriod}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">在留期限</dt>
                  <dd
                    className={`font-medium ${
                      isExpired ? 'text-red-600' : isExpiringWarning ? 'text-yellow-600' : ''
                    }`}
                  >
                    {worker.residenceExpiry}
                    {isExpiringWarning && ` (残り${daysUntilExpiry}日)`}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Employment Contract */}
            {worker.employmentContracts.length > 0 && (
              <div className="card">
                <h2 className="mb-4 text-lg font-semibold">雇用契約</h2>
                {worker.employmentContracts.map((contract) => (
                  <div key={contract.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm text-gray-500">業種</dt>
                        <dd className="font-medium">{contract.jobCategory}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">職種</dt>
                        <dd className="font-medium">{contract.occupation}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">契約期間</dt>
                        <dd className="font-medium">
                          {contract.startDate} 〜 {contract.endDate || '未定'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">給与</dt>
                        <dd className="font-medium">
                          {contract.salary.toLocaleString()}円/
                          {contract.salaryType === 'monthly' ? '月' : '時間'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Info */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">受入企業</h2>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <Link
                    href={`/companies/${worker.company.id}`}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    {worker.company.name}
                  </Link>
                  {worker.office && (
                    <p className="text-sm text-gray-500">{worker.office.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Language Info */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">言語</h2>
              <div className="flex items-start gap-3">
                <Languages className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">母語</p>
                  <p className="font-medium">
                    {LANGUAGE_NAMES[worker.nativeLanguage] || worker.nativeLanguage}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">理解言語</p>
                  <div className="flex flex-wrap gap-1">
                    {worker.understandsLanguages.map((lang) => (
                      <span key={lang} className="badge badge-info">
                        {LANGUAGE_NAMES[lang] || lang}
                      </span>
                    ))}
                  </div>
                  {worker.japaneseLevel && (
                    <>
                      <p className="mt-2 text-sm text-gray-500">日本語レベル</p>
                      <p className="font-medium">{worker.japaneseLevel}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Support Period */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">支援期間</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500">開始日</dt>
                  <dd className="font-medium">{worker.supportStartDate}</dd>
                </div>
                {worker.supportEndDate && (
                  <div>
                    <dt className="text-sm text-gray-500">終了日</dt>
                    <dd className="font-medium">{worker.supportEndDate}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="mb-4 text-lg font-semibold">アクション</h2>
              <div className="space-y-2">
                <Link
                  href={`/support-plans/new?workerId=${worker.id}`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  支援計画を作成
                </Link>
                <Link
                  href={`/interviews/new?workerId=${worker.id}`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  面談を予約
                </Link>
                <Link
                  href={`/consultations/new?workerId=${worker.id}`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  相談を受付
                </Link>
                <Link
                  href={`/documents/new?workerId=${worker.id}`}
                  className="btn btn-secondary w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  書類を作成
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
