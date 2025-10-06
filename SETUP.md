# 🚀 セットアップガイド

AI画像生成システムの環境設定ガイドです。

---

## 📋 前提条件

- Node.js 18.x 以上
- npm または yarn
- Gemini API キー（[Google AI Studio](https://aistudio.google.com/app/apikey)から取得）

---

## ⚡ クイックスタート

### 1. 対話的セットアップ（推奨）

```bash
npm run setup
```

このコマンドで以下の設定を対話的に行えます：

- ✅ Gemini APIキーの設定
- ✅ モデル設定（テキスト・画像）
- ✅ Vercel KV設定（オプショナル）
- ✅ 環境設定（development/production）
- ✅ 詳細設定（レート制限、画像サイズなど）

セットアップが完了すると、`.env.local`ファイルが自動生成されます。

---

## 📝 手動セットアップ

### 1. 環境ファイルの作成

```bash
cp .env .env.local
```

### 2. APIキーの設定

`.env.local`ファイルを開いて、以下の値を設定してください：

```bash
# 必須: Gemini APIキー
GEMINI_API_KEY=your-actual-api-key-here

# オプショナル: Vercel KV
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your-kv-token-here
```

---

## 🔧 設定項目の詳細

### 必須設定

| 環境変数 | 説明 | デフォルト値 |
|---------|------|------------|
| `GEMINI_API_KEY` | Gemini APIキー | - |
| `GEMINI_TEXT_MODEL` | テキスト分析用モデル | `gemini-2.5-flash` |
| `GEMINI_IMAGE_MODEL` | 画像生成用モデル | `gemini-2.5-flash-image` |

### オプショナル設定

| 環境変数 | 説明 | デフォルト値 |
|---------|------|------------|
| `KV_REST_API_URL` | Vercel KVのURL | - |
| `KV_REST_API_TOKEN` | Vercel KVのトークン | - |
| `NODE_ENV` | 環境（development/production） | `development` |
| `RATE_LIMIT_WINDOW_MS` | レート制限ウィンドウ（ミリ秒） | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | レート制限最大リクエスト数 | `100` |

---

## 🎯 APIキーの取得方法

### Gemini APIキー

1. [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
2. 「Create API Key」をクリック
3. プロジェクトを選択（または新規作成）
4. 生成されたAPIキーをコピー

**重要**: APIキーは `AIzaSy` で始まります

### Vercel KV（オプショナル）

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクトを選択
3. 「Storage」→「Create Database」→「KV」を選択
4. `.env.local`タブから環境変数をコピー

---

## 🚀 開発サーバーの起動

### 1. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# フロントエンド
cd frontend && npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

フロントエンドが `http://localhost:3000` で起動します。

---

## ✅ セットアップの確認

### 環境変数の確認

```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ 設定済み' : '✗ 未設定')"
```

### ビルドテスト

```bash
# TypeScript型チェック
npm run type-check

# フロントエンドビルド
cd frontend && npm run build
```

---

## 🔒 セキュリティ注意事項

### ⚠️ 重要

- `.env.local`ファイルは**絶対にGitにコミットしないでください**
- `.gitignore`で除外されていることを確認してください
- APIキーは他人と共有しないでください
- 本番環境ではVercel環境変数を使用してください

### ファイルの安全性チェック

```bash
# .env.localがGit追跡外か確認
git status --ignored | grep .env.local
```

出力に`.env.local`が表示されればOKです。

---

## 🆘 トラブルシューティング

### APIキーエラー

```
エラー: Gemini APIキーが無効です
```

**解決策**:
1. APIキーが `AIzaSy` で始まっているか確認
2. [Google AI Studio](https://aistudio.google.com/app/apikey)でAPIキーを再生成
3. `.env.local`ファイルを再作成（`npm run setup`）

### ポート衝突エラー

```
エラー: Port 3000 is already in use
```

**解決策**:
```bash
# 既存のプロセスを終了
lsof -ti:3000 | xargs kill -9

# または別のポートを使用
PORT=3001 npm run dev
```

### Vercel KV接続エラー

```
エラー: KV not configured, using memory-based
```

**解決策**:
これは警告です。Vercel KVは必須ではありません。
- キャッシュとレート制限がメモリベースになります
- 本番環境では設定を推奨

---

## 📚 次のステップ

1. ✅ セットアップ完了
2. 📖 [API ドキュメント](./api/README.md) を確認
3. 🎨 [フロントエンド開発ガイド](./frontend/README.md) を確認
4. 🚀 [デプロイメントガイド](./DEPLOYMENT.md) を確認

---

## 🤝 サポート

問題が解決しない場合：

1. [Issues](https://github.com/yannsunn/hp-ai-image-generator/issues)で既存の問題を検索
2. 新しいIssueを作成
3. エラーメッセージと環境情報を含めてください

---

**Happy Coding! 🎉**
