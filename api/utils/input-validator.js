// 入力検証ユーティリティ
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URLが指定されていません' };
  }
  
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: '無効なURLプロトコルです' };
    }
    return { valid: true, sanitized: url };
  } catch (e) {
    return { valid: false, error: '無効なURL形式です' };
  }
}

function validateGenerateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '無効なリクエストです' };
  }
  
  if (!body.prompt || typeof body.prompt !== 'string') {
    return { valid: false, error: 'プロンプトが指定されていません' };
  }
  
  return { 
    valid: true, 
    sanitized: {
      prompt: body.prompt,
      additionalInstructions: body.additionalInstructions || [],
      api: body.api || 'auto',
      context: body.context || {}
    }
  };
}

module.exports = {
  validateUrl,
  validateGenerateRequest
};