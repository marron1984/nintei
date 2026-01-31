import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nintei - 登録支援機関DX',
  description: '多点・他国間・多言語 登録支援機関管理プラットフォーム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
