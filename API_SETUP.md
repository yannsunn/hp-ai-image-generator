# AI画像生成システム APIセットアップガイド

## 必要なAPIキー

このシステムを使用するには、以下のAPIキーが必要です：

### 1. OpenAI API Key (DALL-E 3)
- **用途**: 高品質な画像生成、プロンプト解析
- **取得方法**:
  1. [OpenAI Platform](https://platform.openai.com/signup)にアクセス
  2. アカウントを作成またはログイン
  3. [API Keys](https://platform.openai.com/api-keys)ページへ移動
  4. 「Create new secret key」をクリック
  5. キーをコピーして保存

### 2. Stability AI API Key (Stable Diffusion)
- **用途**: アーティスティックな画像生成
- **取得方法**:
  1. [Stability AI](https://platform.stability.ai/)にアクセス
  2. アカウントを作成またはログイン
  3. [Account Keys](https://platform.stability.ai/account/keys)ページへ移動
  4. APIキーを生成
  5. キーをコピーして保存

### 3. Replicate API Token
- **用途**: リアルな人物画像生成
- **取得方法**:
  1. [Replicate](https://replicate.com/)にアクセス
  2. GitHubアカウントでログイン
  3. [Account Settings](https://replicate.com/account/api-tokens)へ移動
  4. 「Create token」をクリック
  5. トークンをコピーして保存

## ローカル環境での設定

1. プロジェクトルートに`.env`ファイルを作成
2. 以下の内容を記入：

```
OPENAI_API_KEY=your_openai_api_key_here
STABILITY_API_KEY=your_stability_api_key_here
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

## Vercelでの設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 「Environment Variables」セクションへ移動
5. 以下の環境変数を追加：
   - `OPENAI_API_KEY`
   - `STABILITY_API_KEY`
   - `REPLICATE_API_TOKEN`

## APIの特徴

### 自動選択について
「自動選択」オプションを選ぶと、システムが以下の基準で最適なAPIを選択します：

- **OpenAI (DALL-E 3)**: 
  - ビジネス向け、プロフェッショナルな画像
  - テキストを含む画像
  - 高い一貫性が必要な場合

- **Stability AI**: 
  - アーティスティックな画像
  - 創造的なスタイル
  - 商品画像

- **Replicate**: 
  - リアルな人物画像
  - チーム写真
  - 証言者の画像

## 料金の目安

- **OpenAI**: $0.04-0.08/画像
- **Stability AI**: $0.01-0.02/画像
- **Replicate**: $0.01-0.05/画像

## トラブルシューティング

### "500 Internal Server Error"が出る場合
1. `.env`ファイルが正しく設定されているか確認
2. APIキーが有効か確認
3. APIの利用制限に達していないか確認

### 画像が生成されない場合
1. コンソールでエラーメッセージを確認
2. ネットワーク接続を確認
3. APIキーの権限を確認