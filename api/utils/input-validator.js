// 入力検証ユーティリティ
const MAX_PROMPT_LENGTH = 5000;
const MAX_BATCH_SIZE = 8;

/**
 * URLの検証とサニタイゼーション
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URLが指定されていません' };
  }

  // XSS対策: 基本的なサニタイゼーション
  const sanitizedUrl = url.trim().replace(/[<>"']/g, '');

  try {
    const urlObj = new URL(sanitizedUrl);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: '無効なURLプロトコルです（http/https のみ）' };
    }

    // ローカルホスト・プライベートIPのチェック（SSRF対策）
    const hostname = urlObj.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./
    ];

    const isPrivate = privatePatterns.some(pattern => pattern.test(hostname));
    if (isPrivate) {
      return { valid: false, error: 'プライベートIPアドレスへのアクセスは許可されていません' };
    }

    return { valid: true, sanitized: sanitizedUrl };
  } catch (e) {
    return { valid: false, error: '無効なURL形式です' };
  }
}

/**
 * プロンプトのサニタイゼーション（XSS/インジェクション対策）
 */
function sanitizePrompt(prompt) {
  if (typeof prompt !== 'string') return '';

  return prompt
    .trim()
    .replace(/[<>]/g, '')  // HTMLタグ除去
    .substring(0, MAX_PROMPT_LENGTH);
}

/**
 * 画像生成リクエストの検証
 */
function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '無効なリクエストです' };
  }

  if (!body.prompt || typeof body.prompt !== 'string') {
    return { valid: false, error: 'プロンプトが指定されていません' };
  }

  // プロンプトの長さチェック
  if (body.prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `プロンプトは${MAX_PROMPT_LENGTH}文字以内にしてください` };
  }

  // 空のプロンプトチェック
  const trimmedPrompt = body.prompt.trim();
  if (trimmedPrompt.length === 0) {
    return { valid: false, error: 'プロンプトは空にできません' };
  }

  // count検証（バッチ生成用）
  let count = 1;
  if (body.count !== undefined) {
    count = parseInt(body.count, 10);
    if (isNaN(count) || count < 1) {
      return { valid: false, error: '生成枚数は1以上の整数を指定してください' };
    }
    if (count > MAX_BATCH_SIZE) {
      return { valid: false, error: `生成枚数は${MAX_BATCH_SIZE}枚以下にしてください` };
    }
  }

  // additionalInstructionsの検証
  let additionalInstructions = [];
  if (body.additionalInstructions) {
    if (!Array.isArray(body.additionalInstructions)) {
      return { valid: false, error: '追加指示は配列形式で指定してください' };
    }
    additionalInstructions = body.additionalInstructions
      .filter(i => typeof i === 'string')
      .map(i => sanitizePrompt(i))
      .filter(i => i.length > 0);
  }

  return {
    valid: true,
    sanitized: {
      prompt: sanitizePrompt(body.prompt),
      additionalInstructions,
      count,
      api: body.api || 'auto',
      context: body.context || {}
    }
  };
}

module.exports = {
  validateUrl,
  validateGenerateRequest
};