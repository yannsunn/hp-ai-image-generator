import logger from './logger';

interface ValidationResult<T = unknown> {
  valid: boolean;
  error?: string;
  errors?: string[];
  sanitized?: T;
  value?: T;
}

interface GenerateRequestBody {
  prompt?: unknown;
  count?: unknown;
  api?: unknown;
  additionalInstructions?: unknown;
  context?: unknown;
}

interface SaveImageRequestBody {
  image?: unknown;
  metadata?: unknown;
}

interface Context {
  industry?: string;
  contentType?: string;
  contentTypes?: string[];
  source_url?: string;
}

interface ImageMetadata {
  original_prompt?: string;
  enhanced_prompt?: string;
  api_used?: string;
  cost?: number;
  generation_time?: number;
  resolution?: string;
  format?: string;
  context?: Context;
}

// XSS対策用のサニタイゼーション
function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// URL検証（より厳密）
function validateUrl(url: unknown): ValidationResult<string> {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URLが提供されていません' };
  }

  // 長さ制限
  if (url.length > 2048) {
    return { valid: false, error: 'URLが長すぎます（最大2048文字）' };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { valid: false, error: 'URL形式が正しくありません' };
  }

  // プロトコル制限
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return { valid: false, error: 'HTTPまたはHTTPSプロトコルのみ許可されています' };
  }

  // 内部ネットワークアクセス防止
  const hostname = urlObj.hostname.toLowerCase();
  const privateNetworks: (string | RegExp)[] = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^169\.254\./, // Link-local
    /^224\./, // Multicast
    /^255\./ // Broadcast
  ];

  for (const pattern of privateNetworks) {
    if (typeof pattern === 'string' && hostname === pattern) {
      return { valid: false, error: '内部ネットワークへのアクセスは許可されていません' };
    }
    if (pattern instanceof RegExp && pattern.test(hostname)) {
      return { valid: false, error: '内部ネットワークへのアクセスは許可されていません' };
    }
  }

  // 危険なドメイン除外（例）
  const blockedDomains = ['malware.com', 'phishing.net'];
  if (blockedDomains.includes(hostname)) {
    return { valid: false, error: 'このドメインはブロックされています' };
  }

  return { valid: true, sanitized: url };
}

// プロンプト検証
function validatePrompt(prompt: unknown): ValidationResult<string> {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'プロンプトが提供されていません' };
  }

  const trimmed = prompt.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'プロンプトを入力してください' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'プロンプトは3文字以上で入力してください' };
  }

  if (trimmed.length > 4000) {
    return { valid: false, error: 'プロンプトが長すぎます（最大4000文字）' };
  }

  // 危険なコンテンツの検出
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /vbscript:/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: '不正なコンテンツが含まれています' };
    }
  }

  return { valid: true, sanitized: sanitizeString(trimmed) };
}

// 数値範囲検証
function validateNumber(value: unknown, min = 1, max = 10, fieldName = '値'): ValidationResult<number> {
  const num = parseInt(String(value), 10);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName}は数値である必要があります` };
  }

  if (num < min || num > max) {
    return { valid: false, error: `${fieldName}は${min}から${max}の間で指定してください` };
  }

  return { valid: true, value: num };
}

// API選択検証
function validateApiChoice(api: unknown): ValidationResult<string> {
  const validApis = ['auto', 'openai', 'stability', 'replicate'];
  
  if (!api || typeof api !== 'string' || !validApis.includes(api.toLowerCase())) {
    return { valid: false, error: '無効なAPI選択です' };
  }

  return { valid: true, value: api.toLowerCase() };
}

// コンテキスト検証
function validateContext(context: unknown): ValidationResult<Context> {
  if (!context || typeof context !== 'object') {
    return { valid: true, sanitized: {} };
  }

  const ctx = context as Record<string, unknown>;
  const sanitized: Context = {};

  // Industry validation
  if (ctx.industry) {
    sanitized.industry = sanitizeString(ctx.industry).substring(0, 50);
  }

  // Content type validation
  if (ctx.contentType) {
    sanitized.contentType = sanitizeString(ctx.contentType).substring(0, 50);
  }

  // Content types array validation
  if (Array.isArray(ctx.contentTypes)) {
    sanitized.contentTypes = ctx.contentTypes
      .slice(0, 10) // 最大10個
      .map(type => sanitizeString(type).substring(0, 50))
      .filter(type => type.length > 0);
  }

  // Source URL validation
  if (ctx.source_url) {
    const urlValidation = validateUrl(ctx.source_url);
    if (urlValidation.valid && urlValidation.sanitized) {
      sanitized.source_url = urlValidation.sanitized;
    }
  }

  return { valid: true, sanitized };
}

// 包括的なリクエスト検証
function validateGenerateRequest(body: GenerateRequestBody): ValidationResult<{
  prompt: string;
  count: number;
  api: string;
  additionalInstructions: string[];
  context: Context;
}> {
  const errors: string[] = [];

  // プロンプト検証
  const promptValidation = validatePrompt(body.prompt);
  if (!promptValidation.valid) {
    errors.push(promptValidation.error!);
  }

  // 枚数検証
  const countValidation = validateNumber(
    body.count || 1, 
    1, 
    8, 
    '生成枚数'
  );
  if (!countValidation.valid) {
    errors.push(countValidation.error!);
  }

  // API選択検証
  const apiValidation = validateApiChoice(body.api || 'auto');
  if (!apiValidation.valid) {
    errors.push(apiValidation.error!);
  }

  // 追加指示検証
  let sanitizedInstructions: string[] = [];
  if (Array.isArray(body.additionalInstructions)) {
    sanitizedInstructions = body.additionalInstructions
      .slice(0, 20) // 最大20個
      .map(inst => {
        const validation = validatePrompt(inst);
        return validation.valid && validation.sanitized ? validation.sanitized : '';
      })
      .filter(inst => inst.length > 0);
  }

  // コンテキスト検証
  const contextValidation = validateContext(body.context);

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      error: errors[0] // 最初のエラーを返す
    };
  }

  return {
    valid: true,
    sanitized: {
      prompt: promptValidation.sanitized!,
      count: countValidation.value!,
      api: apiValidation.value!,
      additionalInstructions: sanitizedInstructions,
      context: contextValidation.sanitized!
    }
  };
}

// 画像保存リクエスト検証
function validateSaveImageRequest(body: SaveImageRequestBody): ValidationResult<{
  image: string;
  metadata: ImageMetadata;
}> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('リクエストボディが必要です');
    return { valid: false, error: errors[0] };
  }

  // 画像データ検証
  if (!body.image || typeof body.image !== 'string') {
    errors.push('画像データが必要です');
  } else {
    // Base64形式の検証
    if (!body.image.startsWith('data:image/') && !body.image.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      errors.push('無効な画像形式です');
    }
    
    // サイズ制限（10MB）
    if (body.image.length > 10 * 1024 * 1024) {
      errors.push('画像データが大きすぎます（最大10MB）');
    }
  }

  // メタデータ検証
  if (!body.metadata || typeof body.metadata !== 'object') {
    errors.push('メタデータが必要です');
  } else {
    const meta = body.metadata as Record<string, unknown>;
    const sanitizedMetadata: ImageMetadata = {};
    
    // 各フィールドをサニタイズ
    if (meta.original_prompt) {
      sanitizedMetadata.original_prompt = sanitizeString(meta.original_prompt).substring(0, 1000);
    }
    
    if (meta.enhanced_prompt) {
      sanitizedMetadata.enhanced_prompt = sanitizeString(meta.enhanced_prompt).substring(0, 1000);
    }
    
    if (meta.api_used) {
      sanitizedMetadata.api_used = sanitizeString(meta.api_used).substring(0, 20);
    }
    
    if (meta.cost && typeof meta.cost === 'number') {
      sanitizedMetadata.cost = Math.max(0, Math.min(meta.cost, 1000)); // 0-1000の範囲
    }
    
    if (meta.generation_time && typeof meta.generation_time === 'number') {
      sanitizedMetadata.generation_time = Math.max(0, Math.min(meta.generation_time, 300000)); // 最大5分
    }
    
    if (meta.resolution) {
      sanitizedMetadata.resolution = sanitizeString(meta.resolution).substring(0, 20);
    }
    
    if (meta.format) {
      sanitizedMetadata.format = sanitizeString(meta.format).substring(0, 20);
    }
    
    if (meta.context && typeof meta.context === 'object') {
      sanitizedMetadata.context = validateContext(meta.context).sanitized;
    }
    
    body.metadata = sanitizedMetadata;
  }

  if (errors.length > 0) {
    return { valid: false, error: errors[0] };
  }

  return {
    valid: true,
    sanitized: {
      image: body.image as string,
      metadata: body.metadata as ImageMetadata
    }
  };
}

export {
  sanitizeString,
  validateUrl,
  validatePrompt,
  validateNumber,
  validateApiChoice,
  validateContext,
  validateGenerateRequest,
  validateSaveImageRequest
};