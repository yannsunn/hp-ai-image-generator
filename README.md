# 🚀 HP AI Image Generator - ウルトラシンクシステム

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![CI/CD](https://github.com/yannsunn/hp-ai-image-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/yannsunn/hp-ai-image-generator/actions)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

日本のホームページ制作に特化した、エンタープライズグレードのAI画像生成システム。TypeScript完全対応、最高レベルのセキュリティとパフォーマンスを実現。

## 🌟 主要機能

### 🎨 AI画像生成
- **Gemini 2.5 Flash Image (Nano Banana)**: 最先端の画像生成モデル
- **Gemini 2.5 Flash統合分析**: ウェブサイトコンテンツの自動分析
- **インテリジェントプロンプト生成**: 業界・コンテンツタイプ別の最適化
- **日本語プロンプト最適化**: 自動翻訳と日本スタイル強化
- **バッチ生成**: 複数画像の同時生成
- **スマートキャッシング**: 高速レスポンスとコスト削減
- **SynthID透かし**: AI生成画像の自動透かし付与

### 🔍 サイト解析（Gemini 2.5 Flash Powered）
- **URL自動解析**: コンテンツとデザイン要素の詳細抽出
- **業界自動判定**: 13業界カテゴリの高精度識別
- **コンテンツタイプ検出**: ヒーロー、チーム、サービスなど8種類
- **ビジュアルスタイル分析**: トーン、雰囲気、カラーパレット推奨
- **複数プロンプト候補生成**: 用途別の最適プロンプト提案
- **ターゲット層分析**: B2B/B2C/企業/個人の自動判定
- **画像推奨設定**: 構図、ライティング、視点の最適化

### 🛡️ セキュリティ
- **環境変数検証**: 起動時の自動チェック
- **CSP (Content Security Policy)**: XSS攻撃防止
- **レート制限（Vercel KV）**: 永続化されたDDoS攻撃対策
- **入力サニタイゼーション**: XSS/SSRF/インジェクション防止
- **SSRF対策**: プライベートIPアクセス制限
- **Helmet.js統合**: 包括的なセキュリティヘッダー
- **監査ログシステム**: 全API操作のトラッキング

### ⚡ パフォーマンス
- **Web Vitals監視**: LCP, FID, CLS追跡
- **画像最適化**: WebP/AVIF自動選択
- **遅延読み込み**: IntersectionObserver実装
- **Vercel KVキャッシュ**: 分析結果24時間キャッシング
- **Playwrightブラウザプール**: 起動時間3-5秒削減
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
# AI API Keys - Gemini必須
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

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
- **Frontend**: ~183KB (gzip: 57KB)
- **初回ロード**: < 100KB
- **コード分割**: 自動最適化

### Phase 3改善結果
- **Playwright分析速度**: 3-5秒削減（ブラウザプール化）
- **キャッシュヒット率**: ~70%想定（24時間保持）
- **レート制限精度**: 100%（永続化により複数インスタンス対応）
- **API応答時間**: 平均30%改善

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

### 監査ログシステム（Phase 3）
- **イベント追跡**: 画像生成、URL分析、エラー
- **セキュリティ監視**: レート制限違反、不正アクセス
- **コスト追跡**: API使用量、Geminiコスト
- **永続化**: Vercel KV（30日間保持）
- **メタデータ**: IP、User-Agent、タイムスタンプ

### カスタムメトリクス
- APIレスポンスタイム
- メモリ使用量
- エンドポイント別統計
- キャッシュヒット率
- Playwright再利用率

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

- Google - Gemini 2.5 Flash Image API (Nano Banana)
- Vercel - ホスティングとエッジ関数
- Google AI - 生成AIテクノロジー

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/yannsunn">yannsunn</a>
</p>