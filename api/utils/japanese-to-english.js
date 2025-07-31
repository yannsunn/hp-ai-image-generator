// 日本語の指示文を英語に変換するマッピング
const instructionMapping = {
  // 品質関連
  '高品質で写実的な画像': 'high quality photorealistic image',
  '高品質': 'high quality',
  '写実的': 'photorealistic',
  '精細': 'detailed',
  '鮮明': 'sharp and clear',
  
  // 雰囲気関連
  '明るく清潔感のある雰囲気': 'bright and clean atmosphere',
  '明るい雰囲気': 'bright atmosphere',
  '清潔感': 'clean and tidy',
  '温かみのある雰囲気': 'warm and welcoming atmosphere',
  '温かみ': 'warm feeling',
  '落ち着いた': 'calm and serene',
  '活気のある': 'vibrant and energetic',
  '静かな': 'quiet and peaceful',
  
  // ビジネス関連
  'プロフェッショナルな印象': 'professional impression',
  'プロフェッショナル': 'professional',
  '信頼感のあるデザイン': 'trustworthy design',
  '信頼感': 'trustworthy',
  'ビジネス向け': 'business oriented',
  'フォーマル': 'formal',
  'カジュアル': 'casual',
  
  // スタイル関連
  'モダンでスタイリッシュ': 'modern and stylish',
  'モダン': 'modern',
  'スタイリッシュ': 'stylish',
  'ミニマリストデザイン': 'minimalist design',
  'ミニマル': 'minimal',
  'シンプル': 'simple',
  '洗練された': 'sophisticated',
  'エレガント': 'elegant',
  
  // 日本的要素
  '日本的な美意識': 'Japanese aesthetic sense',
  '和風': 'Japanese style',
  '日本らしい': 'typically Japanese',
  '和モダン': 'Japanese modern',
  
  // 色調関連
  '明るい色調': 'bright color tones',
  '暗い色調': 'dark color tones',
  'パステルカラー': 'pastel colors',
  'ビビッドな色': 'vivid colors',
  'モノトーン': 'monochrome',
  
  // その他の一般的な指示
  '人物なし': 'no people',
  '人物あり': 'with people',
  '背景をぼかす': 'blurred background',
  '全体的にシャープ': 'overall sharp focus',
  '自然光': 'natural lighting',
  'スタジオ照明': 'studio lighting',
  '朝の光': 'morning light',
  '夕方の光': 'evening light',
  
  // 構図関連
  '中央配置': 'centered composition',
  '三分割構図': 'rule of thirds',
  '対称的': 'symmetrical',
  '非対称': 'asymmetrical',
  'ダイナミック': 'dynamic',
  
  // 視点関連
  '正面から': 'front view',
  '斜めから': 'diagonal view',
  '上から': 'top view',
  '下から': 'bottom view',
  '鳥瞰図': 'bird\'s eye view',
  
  // 感情・印象
  '楽しい': 'joyful',
  '真面目': 'serious',
  '革新的': 'innovative',
  '伝統的': 'traditional',
  '親しみやすい': 'friendly and approachable',
  '高級感': 'luxurious',
  'カジュアル': 'casual',
  'フォーマル': 'formal'
};

// 日本語の指示文を英語に変換する関数
function translateInstruction(japaneseText) {
  // 完全一致の場合
  if (instructionMapping[japaneseText]) {
    return instructionMapping[japaneseText];
  }
  
  // 部分一致で変換
  let translatedText = japaneseText;
  Object.entries(instructionMapping).forEach(([jp, en]) => {
    if (translatedText.includes(jp)) {
      translatedText = translatedText.replace(jp, en);
    }
  });
  
  // 基本的な単語の変換
  const basicWords = {
    'で': ' with ',
    'の': ' of ',
    'と': ' and ',
    'または': ' or ',
    'ような': ' like ',
    'っぽい': ' style ',
    '風': ' style ',
    '的': ' style ',
    '感': ' feeling ',
    '画像': 'image',
    '写真': 'photo',
    'デザイン': 'design',
    '雰囲気': 'atmosphere',
    '印象': 'impression',
    'スタイル': 'style',
    '色': 'color',
    '光': 'light',
    '影': 'shadow',
    '背景': 'background',
    '前景': 'foreground'
  };
  
  Object.entries(basicWords).forEach(([jp, en]) => {
    translatedText = translatedText.replace(new RegExp(jp, 'g'), en);
  });
  
  // 不要なスペースの調整
  translatedText = translatedText.replace(/\s+/g, ' ').trim();
  
  return translatedText;
}

// 複数の指示文を変換
function translateInstructions(instructions) {
  if (Array.isArray(instructions)) {
    return instructions
      .filter(instruction => instruction && instruction.trim())
      .map(instruction => translateInstruction(instruction));
  }
  return [];
}

module.exports = {
  translateInstruction,
  translateInstructions
};