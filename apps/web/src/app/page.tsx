import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Nintei
        </h1>
        <p className="mt-3 text-xl text-gray-600">
          登録支援機関DX プラットフォーム
        </p>
        <p className="mt-2 text-sm text-gray-500">
          多点・他国間・多言語対応
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="btn btn-primary px-8 py-3 text-base"
          >
            ログイン
          </Link>
          <Link
            href="/docs"
            className="btn btn-secondary px-8 py-3 text-base"
          >
            APIドキュメント
          </Link>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900">支援計画管理</h3>
            <p className="mt-2 text-sm text-gray-600">
              10項目の支援計画をタスク化し、期限・証跡・同意を管理
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900">定期面談</h3>
            <p className="mt-2 text-sm text-gray-600">
              3か月ごとの面談を予定・実施・記録、未実施アラート
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900">多言語対応</h3>
            <p className="mt-2 text-sm text-gray-600">
              日本語・英語・ベトナム語・中国語など9言語対応
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
