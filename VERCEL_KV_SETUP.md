# Vercel KV Storage セットアップガイド

## 手順

### 1. Vercelにログイン
https://vercel.com にアクセスしてログイン

### 2. KVストレージを作成

1. ダッシュボードの「Storage」タブをクリック
2. 「Create Database」ボタンをクリック
3. 「KV」を選択
4. 以下を設定：
   - Database Name: `hp-image-history`（任意の名前）
   - Region: 最寄りのリージョンを選択
5. 「Create」をクリック

### 3. 環境変数を取得

作成完了後、「.env.local」タブに以下の形式で表示されます：

```
KV_URL="redis://default:AX7aASQgM2Y5YTk2ODgtZTY3NC00ZmY0LWI5MTAtMzY1NGRmODg1YzlmZTdjZGM5MDdhNGI0NGExMmE5ODQ2NTY4ZjRjOGVhNw@guiding-sculpin-41234.kv.vercel-storage.com:41234"
KV_REST_API_URL="https://guiding-sculpin-41234.kv.vercel-storage.com"
KV_REST_API_TOKEN="AX7aASQgM2Y5YTk2ODgtZTY3NC00ZmY0LWI5MTAtMzY1NGRmODg1YzlmZTdjZGM5MDdhNGI0NGExMmE5ODQ2NTY4ZjRjOGVhNw"
KV_REST_API_READ_ONLY_TOKEN="ApnaASQgM2Y5YTk2ODgtZTY3NC00ZmY0LWI5MTAtMzY1NGRmODg1Yzlmcm8"
```

### 4. .envファイルを更新

取得した値を`.env`ファイルのコメントアウトされた部分に貼り付けて、コメントを解除：

```bash
# Optional: Vercel KV Storage (画像履歴保存用)
KV_URL=取得した値をここに貼り付け
KV_REST_API_URL=取得した値をここに貼り付け
KV_REST_API_TOKEN=取得した値をここに貼り付け
KV_REST_API_READ_ONLY_TOKEN=取得した値をここに貼り付け
```

### 5. プロジェクトと連携（Vercelにデプロイする場合）

1. Vercelのプロジェクト設定に移動
2. 「Environment Variables」セクション
3. 「Import from Vercel KV」をクリック
4. 作成したKVストレージを選択

## 機能

Vercel KVを設定すると以下が可能になります：

- 生成した画像の履歴保存
- 過去の生成画像の検索・表示
- プロンプトの再利用
- 使用統計の記録

## 注意事項

- 無料プランでは月間10,000リクエストまで
- データは30日間保存（無料プラン）
- 本番環境では適切なキャッシュ設定を推奨