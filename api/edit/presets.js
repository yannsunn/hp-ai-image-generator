export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 編集プリセットデータ
  const presets = {
    brightness: [
      { name: '明るく', value: 1.2, description: '画像を明るくします' },
      { name: '標準', value: 1.0, description: 'デフォルトの明度' },
      { name: '暗く', value: 0.8, description: '画像を暗くします' }
    ],
    contrast: [
      { name: '高コントラスト', value: 1.3, description: 'コントラストを強くします' },
      { name: '標準', value: 1.0, description: 'デフォルトのコントラスト' },
      { name: '低コントラスト', value: 0.7, description: 'コントラストを弱くします' }
    ],
    saturation: [
      { name: '鮮やか', value: 1.3, description: '彩度を上げます' },
      { name: '標準', value: 1.0, description: 'デフォルトの彩度' },
      { name: 'モノトーン調', value: 0.3, description: '彩度を下げます' }
    ],
    filter: [
      { name: 'なし', value: 'none', description: 'フィルターを適用しません' },
      { name: 'セピア', value: 'sepia', description: 'セピア調にします' },
      { name: 'グレースケール', value: 'grayscale', description: '白黒にします' },
      { name: 'ヴィンテージ', value: 'vintage', description: 'ヴィンテージ風にします' },
      { name: 'ソフト', value: 'soft', description: 'ソフトな印象にします' }
    ],
    style: [
      { name: 'ナチュラル', value: 'natural', description: '自然な仕上がり' },
      { name: 'プロフェッショナル', value: 'professional', description: 'ビジネス向け' },
      { name: 'アーティスティック', value: 'artistic', description: '芸術的な仕上がり' },
      { name: 'モダン', value: 'modern', description: '現代的なスタイル' },
      { name: 'エレガント', value: 'elegant', description: '上品な仕上がり' }
    ]
  };

  try {
    return res.status(200).json({
      success: true,
      presets,
      categories: Object.keys(presets),
      total_presets: Object.values(presets).reduce((sum, arr) => sum + arr.length, 0)
    });
  } catch (error) {
    console.error('Presets API Error:', error);
    return res.status(500).json({
      error: 'サーバーエラー',
      message: error.message
    });
  }
}