# 🚀 HP AI Image Generator - ウルトラシンクシステム

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![CI/CD](https://github.com/yannsunn/hp-ai-image-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/yannsunn/hp-ai-image-generator/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

日本のホームページ制作に特化した、エンタープライズグレードのAI画像生成システム。TypeScript完全対応、最高レベルのセキュリティとパフォーマンスを実現。

## 🌟 主要機能

### 🎨 AI画像生成
- **マルチプロバイダー対応**: OpenAI DALL-E 3, Stability AI, Replicate
- **日本語プロンプト最適化**: 自動翻訳と日本スタイル強化
- **バッチ生成**: 複数画像の同時生成
- **スマートキャッシング**: 高速レスポンスとコスト削減

### 🔍 サイト解析
- **URL自動解析**: コンテンツとデザイン要素の抽出
- **業界自動判定**: 12業界カテゴリの自動識別
- **コンテンツタイプ検出**: ヒーロー、チーム、サービスなど10種類
- **プロンプト自動生成**: 解析結果に基づく最適化

### 🛡️ セキュリティ
- **環境変数検証**: 起動時の自動チェック
- **CSP (Content Security Policy)**: XSS攻撃防止
- **レート制限**: DDoS攻撃対策
- **入力サニタイゼーション**: SQLインジェクション/XSS防止
- **Helmet.js統合**: 包括的なセキュリティヘッダー

### ⚡ パフォーマンス
- **Web Vitals監視**: LCP, FID, CLS追跡
- **画像最適化**: WebP/AVIF自動選択
- **遅延読み込み**: IntersectionObserver実装
- **メモリキャッシュ**: 高速レスポンス
- **リソースヒント**: preconnect/prefetch最適化

## 🏗️ アーキテクチャ

### 技術スタック
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **API**: RESTful API with OpenAPI 3.0
- **Deploy**: Vercel (Edge Functions対応)
- **Monitoring**: Sentry + Custom Performance Metrics

### プロジェクト構造
```
hp-ai-image-generator/
├── api/                    # APIエンドポイント (TypeScript)
│   ├── generate.ts        # 画像生成API
│   ├── analyze-url.ts     # URL解析API
│   ├── analyze-site.ts    # サイト解析API
│   ├── middleware/        # Express ミドルウェア
│   └── utils/            # ユーティリティ関数
├── frontend/              # React フロントエンド
│   ├── src/
│   │   ├── components/   # UIコンポーネント (TSX)
│   │   ├── types/       # TypeScript型定義
│   │   └── utils/       # ユーティリティ関数
│   └── dist/            # ビルド出力
├── tests/                # テストスイート
├── .github/              # GitHub Actions CI/CD
└── types/               # グローバル型定義
```

## 🚀 クイックスタート

### 必要条件
- Node.js 18.x以上
- npm 9.x以上
- TypeScript 5.x

### インストール
```bash
# リポジトリをクローン
git clone https://github.com/yannsunn/hp-ai-image-generator.git
cd hp-ai-image-generator

# 依存関係をインストール
npm install
cd frontend && npm install && cd ..

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

### 開発サーバー起動
```bash
# フロントエンド開発サーバー
cd frontend && npm run dev

# TypeScript監視モード
npm run type-check -- --watch
```

### ビルド
```bash
# プロダクションビルド
cd frontend && npm run build

# TypeScriptコンパイル
npm run build:ts
```

## 🔧 環境変数

```env
# AI API Keys (最低1つ必須)
OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...

# Vercel KV (オプション - 画像履歴保存用)
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...

# セキュリティ設定
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
INTERNAL_API_KEY=your-internal-api-key

# エラートラッキング (オプション)
SENTRY_DSN=https://...

# パフォーマンス設定
RATE_LIMIT_MS=500
API_TIMEOUT_MS=120000
MAX_BATCH_SIZE=8
LOG_LEVEL=error
```

## 📊 パフォーマンス指標

### Web Vitals目標値
- **LCP (Largest Contentful Paint)**: < 2.5秒
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 600ms

### ビルドサイズ
- **Frontend**: ~180KB (gzip: 57KB)
- **初回ロード**: < 100KB
- **コード分割**: 自動最適化

## 🧪 テスト

```bash
# ユニットテスト実行
npm test

# カバレッジレポート生成
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

### テストカバレッジ目標
- ユニットテスト: 80%以上
- 統合テスト: 主要フロー100%
- E2Eテスト: クリティカルパス100%

## 🚢 デプロイ

### Vercel自動デプロイ
1. GitHubリポジトリをVercelに接続
2. 環境変数を設定
3. mainブランチへのプッシュで自動デプロイ

### CI/CDパイプライン
- **Security Scan**: npm audit + Snyk
- **Lint & Type Check**: ESLint + TypeScript
- **Test**: Jest + Coverage
- **Build**: Vite production build
- **Deploy**: Vercel自動デプロイ

## 🔒 セキュリティ

### 実装済みセキュリティ対策
- ✅ HTTPS強制 (HSTS)
- ✅ XSS防止 (CSP, サニタイゼーション)
- ✅ SQLインジェクション対策
- ✅ CSRF保護
- ✅ レート制限
- ✅ 環境変数検証
- ✅ APIキー認証
- ✅ エラー情報の漏洩防止

## 📈 監視とログ

### Sentry統合
- リアルタイムエラー追跡
- パフォーマンスモニタリング
- ユーザーコンテキスト追跡
- センシティブ情報の自動除去

### カスタムメトリクス
- APIレスポンスタイム
- メモリ使用量
- エンドポイント別統計
- キャッシュヒット率

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを作成して変更内容を議論してください。

### 開発ガイドライン
1. TypeScript厳密モードを維持
2. テストカバレッジ80%以上を維持
3. ESLintルールに従う
4. コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)形式

## 📜 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- OpenAI - DALL-E 3 API
- Stability AI - Stable Diffusion API
- Replicate - モデルホスティング
- Vercel - ホスティングとエッジ関数

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yannsunn">yannsunn</a>
</p>