# Nintei - 登録支援機関DX

多点・他国間・多言語対応の登録支援機関向けプラットフォーム

## 概要

特定技能外国人の支援を行う登録支援機関向けの業務管理システムです。
支援計画（10項目）の管理、定期面談、相談対応、書類生成などを一元管理し、
受入企業・士業との連携を可能にします。

## 機能

### コア機能
- **テナント管理**: 登録支援機関の組織階層（支店/チーム/担当者）
- **顧客管理**: 受入企業、事業所、現場、担当者
- **外国人管理**: 個人情報、連絡先、母語/理解言語、在留関連、雇用契約
- **支援計画**: 10項目のテンプレート + 個別上書き、タスク化、証跡管理
- **定期面談**: 予定・実施・記録・未実施アラート（3か月に1回以上）
- **相談/苦情**: 受付→対応→クローズ、多言語対応、通訳者記録
- **期限管理**: 在留期限、面談、届出、社内締切のアラート
- **書類生成**: テンプレート差し込み、不備チェック、版管理

### 多言語対応
- 日本語、英語、ベトナム語、中国語、インドネシア語、タイ語、ミャンマー語、ネパール語、タガログ語

### 権限管理（RBAC）
- 登録支援機関: 管理者/支援責任者/支援担当者/通訳/監査閲覧
- 受入企業: 管理者/人事/現場上司/閲覧のみ
- 士業: 管理者/実務/閲覧のみ

## 技術スタック

- **Monorepo**: pnpm workspaces
- **API**: Fastify + Prisma + PostgreSQL
- **Web**: Next.js 15 + React 19 + Tailwind CSS
- **認証**: JWT + 2FA対応
- **i18n**: カスタム実装（JSON辞書）

## プロジェクト構造

```
nintei/
├── apps/
│   ├── api/          # Fastify API サーバー
│   └── web/          # Next.js Web アプリ
├── packages/
│   ├── shared/       # 共有型定義・ユーティリティ
│   └── i18n/         # 多言語対応
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## セットアップ

### 前提条件
- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### インストール

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp apps/api/.env.example apps/api/.env
# .env を編集してデータベース接続情報を設定

# データベースのセットアップ
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 開発サーバーの起動
pnpm dev
```

### 開発サーバー

- API: http://localhost:3001
- Web: http://localhost:3000
- API Docs: http://localhost:3001/docs

### テストアカウント

- 管理者: admin@example.com / password123
- スタッフ: staff@example.com / password123

## 開発

### コマンド

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# テスト
pnpm test

# リント
pnpm lint

# データベース操作
pnpm db:generate    # Prismaクライアント生成
pnpm db:migrate     # マイグレーション実行
pnpm db:seed        # シードデータ投入
pnpm db:studio      # Prisma Studio起動
```

### コーディング規約

- 型安全: `any` 禁止、`unknown` → narrowing
- 例外設計: API は必ずエラーコード/メッセージを統一
- DB変更は必ず migration + seed 更新
- 重要ドメインはユースケース層を切る

## ライセンス

Private - All rights reserved
