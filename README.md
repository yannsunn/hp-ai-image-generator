# AI画像生成システム（HP制作用）

プロフェッショナルなホームページ用画像を生成するAIシステムです。

## 主な機能

### 画像生成機能
- **複数AI統合**: OpenAI (DALL-E 3)、Stability AI、Replicate (FLUX)
- **自動API選択**: プロンプト内容に基づいて最適なAPIを自動選択
- **バッチ生成**: 複数画像の並列生成
- **コスト管理**: リアルタイムコスト表示

### 画像編集機能
- **自然言語編集**: 日本語での編集指示対応
- **プリセット編集**: ワンクリックで適用可能な定型編集
- **編集履歴**: 過去の編集内容の保存・復元
- **バッチ編集**: 複数画像の一括処理

### コンテンツ解析
- **業界別最適化**: 業界に応じたスタイル提案
- **コンテンツタイプ認識**: ヒーロー画像、商品画像など
- **プロンプト拡張**: 自動的な品質向上

## 必要な環境設定

1. `.env.example`を`.env`にコピー
2. 以下のAPIキーを設定：

### 必須APIキー
- `OPENAI_API_KEY`: OpenAI APIキー（プロンプト最適化・画像生成）
- `REPLICATE_API_TOKEN`: Replicate APIトークン（高品質画像生成）

### オプション設定
- Vercel KV Storage（画像履歴保存用）
  - `KV_URL`
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`

## インストール

```bash
# APIディレクトリ
cd api
npm install

# フロントエンド
cd frontend
npm install
npm run build
```

## 起動方法

```bash
# 開発環境
cd api
npm run dev

# 本番環境
cd api
npm start
```

## Vercelへのデプロイ

### 1. Vercel CLIのインストール
```bash
npm i -g vercel
```

### 2. プロジェクトのデプロイ
```bash
vercel
```

### 3. 環境変数の設定
Vercelダッシュボードで以下の環境変数を設定：
- `OPENAI_API_KEY`
- `STABILITY_API_KEY`
- `REPLICATE_API_TOKEN`

### 4. 本番デプロイ
```bash
vercel --prod
```

## 技術スタック

### バックエンド
- Node.js / Express
- OpenAI SDK
- Replicate SDK
- Cheerio (サイト解析)

### フロントエンド
- React
- Tailwind CSS
- Vite
- Lucide Icons

## API エンドポイント

- `POST /api/generate`: 単一画像生成
- `POST /api/generate/batch`: バッチ画像生成
- `POST /api/analyze`: プロンプト解析・最適化
- `POST /api/analyze-url`: URL解析
- `POST /api/edit/image`: 画像編集

## 本番環境での注意事項

- すべてのAPIキーが正しく設定されていることを確認
- レート制限の設定を環境に合わせて調整
- CORS設定を本番ドメインに限定することを推奨

## ライセンス

MIT License

## サポート

問題が発生した場合は、Issueを作成してください。