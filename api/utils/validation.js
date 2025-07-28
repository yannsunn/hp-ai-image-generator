// 画像データの検証とサイズ制限
const MAX_IMAGE_SIZE_MB = 10; // 10MB制限

function validateImageData(imageData) {
  if (!imageData) {
    return { valid: false, error: '画像データが提供されていません' };
  }
  
  // Base64形式の確認
  const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
  if (!base64Regex.test(imageData)) {
    return { valid: false, error: '無効な画像形式です' };
  }
  
  // サイズチェック（Base64は元のサイズの約1.33倍）
  const sizeInBytes = (imageData.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > MAX_IMAGE_SIZE_MB) {
    return { 
      valid: false, 
      error: `画像サイズが大きすぎます（最大${MAX_IMAGE_SIZE_MB}MB）` 
    };
  }
  
  return { valid: true };
}

// プロンプトの検証
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'プロンプトが入力されていません' };
  }
  
  if (prompt.length < 3) {
    return { valid: false, error: 'プロンプトが短すぎます（3文字以上）' };
  }
  
  if (prompt.length > 1000) {
    return { valid: false, error: 'プロンプトが長すぎます（1000文字以内）' };
  }
  
  return { valid: true };
}

module.exports = {
  validateImageData,
  validatePrompt,
  MAX_IMAGE_SIZE_MB
};