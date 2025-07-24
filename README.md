# AI画像生成システム - ホームページ制作用

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yannsunn/hp-ai-image-generator)

ホームページ制作に特化したAI画像生成・編集システムです。複数のAI APIを統合し、自然言語による画像編集機能を提供します。

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

## セットアップ

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd HP用画像生成システム
```

### 2. 環境変数の設定
```bash
cp .env.example .env
```

以下のAPIキーを`.env`ファイルに設定：
- `OPENAI_API_KEY`: OpenAI APIキー
- `STABILITY_API_KEY`: Stability AI APIキー
- `REPLICATE_API_TOKEN`: Replicate APIトークン

### 3. 依存関係のインストール

#### バックエンド
```bash
pip install -r requirements.txt
```

#### フロントエンド
```bash
cd frontend
npm install
```

### 4. ローカル実行

#### 開発モード
```bash
# バックエンド
python src/main.py

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

#### 本番ビルド
```bash
cd frontend
npm run build
cd ..
python src/main.py
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
- Flask (Python)
- OpenAI SDK
- Pillow (画像処理)
- asyncio/aiohttp (非同期処理)

### フロントエンド
- React
- Tailwind CSS
- Vite
- Lucide Icons

## API仕様

### 画像生成
- `POST /api/generate` - 単一画像生成
- `POST /api/generate/batch` - バッチ画像生成
- `GET /api/apis/available` - 利用可能なAPI一覧

### 画像編集
- `POST /api/edit/image` - 画像編集
- `POST /api/edit/batch` - バッチ編集
- `GET /api/edit/presets` - プリセット一覧

### その他
- `POST /api/analyze` - プロンプト解析
- `GET /api/health` - ヘルスチェック

## ライセンス

MIT License

## サポート

問題が発生した場合は、Issueを作成してください。