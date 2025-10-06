#!/usr/bin/env node

/**
 * 🚀 AI画像生成システム - セットアップCLI
 *
 * このスクリプトは対話的に環境設定を行います
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// カラー出力用のANSIコード
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 対話的入力インターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 質問を行うヘルパー関数
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// バナー表示
function showBanner() {
  console.log('\n');
  console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║                                                        ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║        🎨 AI画像生成システム - セットアップ           ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║                                                        ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('\n');
  console.log(`${colors.dim}環境設定を対話的に行います${colors.reset}\n`);
}

// 成功メッセージ
function showSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

// エラーメッセージ
function showError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// 警告メッセージ
function showWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// 情報メッセージ
function showInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

// セクションヘッダー
function showSection(title) {
  console.log(`\n${colors.bright}${colors.magenta}▶ ${title}${colors.reset}\n`);
}

// APIキーのバリデーション
function validateGeminiApiKey(key) {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'APIキーは必須です' };
  }

  if (!key.startsWith('AIzaSy')) {
    return { valid: false, error: 'Gemini APIキーは "AIzaSy" で始まる必要があります' };
  }

  if (key.length < 30) {
    return { valid: false, error: 'APIキーが短すぎます' };
  }

  return { valid: true };
}

// URLのバリデーション
function validateUrl(url) {
  if (!url || url.trim() === '') {
    return { valid: true }; // オプショナル
  }

  try {
    new URL(url);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: '無効なURL形式です' };
  }
}

// メイン処理
async function main() {
  showBanner();

  const config = {
    // AI API設定
    GEMINI_API_KEY: '',
    GEMINI_TEXT_MODEL: 'gemini-2.5-flash',
    GEMINI_IMAGE_MODEL: 'gemini-2.5-flash-image',

    // Vercel KV設定
    KV_REST_API_URL: '',
    KV_REST_API_TOKEN: '',

    // 環境設定
    NODE_ENV: 'development',

    // CORS設定
    CORS_ORIGIN: 'http://localhost:3000',

    // レート制限
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '100',

    // API設定
    MAX_IMAGE_SIZE: '2048',
    IMAGE_QUALITY: '100'
  };

  try {
    // 1. Gemini API設定
    showSection('1. Gemini API設定');
    showInfo('Google AI StudioからAPIキーを取得してください');
    showInfo('URL: https://aistudio.google.com/app/apikey');

    let apiKeyValid = false;
    while (!apiKeyValid) {
      const apiKey = await question(`${colors.cyan}Gemini APIキー:${colors.reset} `);
      const validation = validateGeminiApiKey(apiKey);

      if (validation.valid) {
        config.GEMINI_API_KEY = apiKey;
        showSuccess('APIキーを設定しました');
        apiKeyValid = true;
      } else {
        showError(validation.error);
      }
    }

    const useDefaultModels = await question(`${colors.cyan}デフォルトのモデル設定を使用しますか？ (Y/n):${colors.reset} `);
    if (useDefaultModels.toLowerCase() !== 'n') {
      showInfo(`テキストモデル: ${config.GEMINI_TEXT_MODEL}`);
      showInfo(`画像モデル: ${config.GEMINI_IMAGE_MODEL}`);
      showSuccess('デフォルトモデルを使用します');
    } else {
      config.GEMINI_TEXT_MODEL = await question(`${colors.cyan}テキストモデル [${config.GEMINI_TEXT_MODEL}]:${colors.reset} `) || config.GEMINI_TEXT_MODEL;
      config.GEMINI_IMAGE_MODEL = await question(`${colors.cyan}画像モデル [${config.GEMINI_IMAGE_MODEL}]:${colors.reset} `) || config.GEMINI_IMAGE_MODEL;
    }

    // 2. Vercel KV設定（オプショナル）
    showSection('2. Vercel KV設定（オプショナル）');
    showInfo('キャッシュとレート制限にVercel KVを使用します');

    const useKV = await question(`${colors.cyan}Vercel KVを設定しますか？ (y/N):${colors.reset} `);
    if (useKV.toLowerCase() === 'y') {
      let kvUrlValid = false;
      while (!kvUrlValid) {
        const kvUrl = await question(`${colors.cyan}KV REST API URL:${colors.reset} `);
        const validation = validateUrl(kvUrl);

        if (validation.valid) {
          config.KV_REST_API_URL = kvUrl;
          showSuccess('KV URLを設定しました');
          kvUrlValid = true;
        } else {
          showError(validation.error);
        }
      }

      config.KV_REST_API_TOKEN = await question(`${colors.cyan}KV REST API Token:${colors.reset} `);
      showSuccess('KV Tokenを設定しました');
    } else {
      showInfo('Vercel KVをスキップします（メモリベースのフォールバックを使用）');
    }

    // 3. 環境設定
    showSection('3. 環境設定');
    const envChoice = await question(`${colors.cyan}環境を選択してください (1: development, 2: production) [1]:${colors.reset} `);
    config.NODE_ENV = envChoice === '2' ? 'production' : 'development';
    showSuccess(`環境: ${config.NODE_ENV}`);

    // 4. 詳細設定
    showSection('4. 詳細設定');
    const advancedSettings = await question(`${colors.cyan}詳細設定を変更しますか？ (y/N):${colors.reset} `);

    if (advancedSettings.toLowerCase() === 'y') {
      config.RATE_LIMIT_WINDOW_MS = await question(`${colors.cyan}レート制限ウィンドウ（ミリ秒） [${config.RATE_LIMIT_WINDOW_MS}]:${colors.reset} `) || config.RATE_LIMIT_WINDOW_MS;
      config.RATE_LIMIT_MAX_REQUESTS = await question(`${colors.cyan}レート制限最大リクエスト数 [${config.RATE_LIMIT_MAX_REQUESTS}]:${colors.reset} `) || config.RATE_LIMIT_MAX_REQUESTS;
      config.MAX_IMAGE_SIZE = await question(`${colors.cyan}最大画像サイズ [${config.MAX_IMAGE_SIZE}]:${colors.reset} `) || config.MAX_IMAGE_SIZE;
      config.IMAGE_QUALITY = await question(`${colors.cyan}画像品質 [${config.IMAGE_QUALITY}]:${colors.reset} `) || config.IMAGE_QUALITY;
    } else {
      showInfo('デフォルトの詳細設定を使用します');
    }

    // 5. .env.local ファイル生成
    showSection('5. 設定ファイル生成');

    const envContent = `# AI画像生成システム - ローカル環境設定
# 自動生成日時: ${new Date().toLocaleString('ja-JP')}

# ⚠️ 重要: このファイルは機密情報を含みます
# Gitにコミットしないでください（.gitignoreで除外されています）

# AI API Keys
GEMINI_API_KEY=${config.GEMINI_API_KEY}
GEMINI_TEXT_MODEL=${config.GEMINI_TEXT_MODEL}
GEMINI_IMAGE_MODEL=${config.GEMINI_IMAGE_MODEL}

# Vercel KV (オプショナル)
${config.KV_REST_API_URL ? `KV_REST_API_URL=${config.KV_REST_API_URL}` : '# KV_REST_API_URL=https://your-kv-url.upstash.io'}
${config.KV_REST_API_TOKEN ? `KV_REST_API_TOKEN=${config.KV_REST_API_TOKEN}` : '# KV_REST_API_TOKEN=your-kv-token-here'}

# Environment Configuration
NODE_ENV=${config.NODE_ENV}

# CORS Configuration
CORS_ORIGIN=${config.CORS_ORIGIN}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=${config.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${config.RATE_LIMIT_MAX_REQUESTS}

# API Configuration
MAX_IMAGE_SIZE=${config.MAX_IMAGE_SIZE}
IMAGE_QUALITY=${config.IMAGE_QUALITY}
`;

    const envFilePath = path.join(__dirname, '.env.local');

    // 既存ファイルのチェック
    if (fs.existsSync(envFilePath)) {
      showWarning('.env.local ファイルが既に存在します');
      const overwrite = await question(`${colors.cyan}上書きしますか？ (y/N):${colors.reset} `);

      if (overwrite.toLowerCase() !== 'y') {
        showInfo('セットアップをキャンセルしました');
        rl.close();
        return;
      }

      // バックアップ作成
      const backupPath = path.join(__dirname, `.env.local.backup.${Date.now()}`);
      fs.copyFileSync(envFilePath, backupPath);
      showInfo(`バックアップを作成しました: ${path.basename(backupPath)}`);
    }

    // ファイル書き込み
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    showSuccess('.env.local ファイルを作成しました');

    // 6. 完了メッセージ
    console.log('\n');
    console.log(`${colors.green}${colors.bright}╔════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║                                                        ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║              ✓ セットアップ完了！                      ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}║                                                        ║${colors.reset}`);
    console.log(`${colors.green}${colors.bright}╚════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('\n');

    showInfo('次のステップ:');
    console.log(`  ${colors.cyan}1.${colors.reset} npm install で依存関係をインストール`);
    console.log(`  ${colors.cyan}2.${colors.reset} cd frontend && npm install でフロントエンドの依存関係をインストール`);
    console.log(`  ${colors.cyan}3.${colors.reset} npm run dev で開発サーバーを起動`);
    console.log('\n');

    showSuccess('セットアップが正常に完了しました！');

  } catch (error) {
    showError(`エラーが発生しました: ${error.message}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// エラーハンドリング
process.on('SIGINT', () => {
  console.log('\n');
  showWarning('セットアップを中断しました');
  process.exit(0);
});

// 実行
main().catch((error) => {
  showError(`予期しないエラー: ${error.message}`);
  process.exit(1);
});
