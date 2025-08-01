import logger from './logger';

interface IndustryResult {
  industry: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
}

interface ContentTypeResult {
  type: string;
  score?: number;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
}

interface AnalysisResult {
  industry: IndustryResult | null;
  contentTypes: ContentTypeResult[];
  analysis: {
    textLength?: number;
    url?: string;
    timestamp: string;
    error?: string;
  };
}

// 業界キーワードマッピング
const industryKeywords: Record<string, string[]> = {
  'technology': [
    'テクノロジー', 'IT', 'システム', 'ソフトウェア', 'アプリ', 'デジタル', 'AI', '人工知能',
    'tech', 'software', 'digital', 'system', 'app', 'web', 'cloud', 'サーバー', 'データ',
    'プログラミング', '開発', 'developer', 'エンジニア', 'engineer', 'code', 'コード'
  ],
  'healthcare': [
    '医療', '健康', 'ヘルスケア', '病院', 'クリニック', '薬', '医師', '看護師', '治療',
    'medical', 'health', 'clinic', 'hospital', 'doctor', 'nurse', 'medicine', 'treatment',
    'wellness', 'care', 'patient', '患者', '診療', '医学'
  ],
  'education': [
    '教育', '学校', '大学', '学習', '勉強', '研修', 'スクール', '塾', '講座',
    'education', 'school', 'university', 'learning', 'study', 'course', 'training',
    'academy', 'lesson', '授業', '講師', 'teacher', '先生', '生徒', 'student'
  ],
  'finance': [
    '金融', '銀行', '保険', '投資', '資産', '融資', 'ローン', 'クレジット', '決済',
    'finance', 'bank', 'insurance', 'investment', 'loan', 'credit', 'payment',
    'financial', 'money', 'asset', '資金', '経済', 'economy'
  ],
  'consulting': [
    'コンサルティング', '経営', '戦略', 'アドバイザー', 'コンサルタント', '相談',
    'consulting', 'consultant', 'strategy', 'business', 'advisory', 'management',
    '支援', 'サポート', 'support', '改善', 'improvement'
  ],
  'restaurant': [
    'レストラン', '飲食', '料理', 'カフェ', '居酒屋', 'バー', '食事', 'グルメ',
    'restaurant', 'cafe', 'bar', 'food', 'dining', 'cuisine', 'menu', 'chef',
    '和食', '洋食', '中華', 'イタリアン', 'フレンチ', 'delicious', 'おいしい'
  ],
  'retail': [
    '小売', 'ショップ', '店舗', 'EC', '通販', 'オンラインショップ', '販売', '商品',
    'retail', 'shop', 'store', 'ecommerce', 'online', 'shopping', 'product',
    'fashion', 'ファッション', '服', 'アパレル', 'goods', '雑貨'
  ],
  'manufacturing': [
    '製造', '工場', '生産', 'メーカー', '製品', '部品', '品質', '技術',
    'manufacturing', 'factory', 'production', 'maker', 'industrial', 'quality',
    '自動車', 'automotive', '機械', 'machinery', '電子', 'electronics'
  ],
  'realestate': [
    '不動産', '物件', 'マンション', '住宅', '土地', '賃貸', '売買', '投資',
    'real estate', 'property', 'house', 'apartment', 'land', 'rental', 'home',
    '建築', 'construction', '設計', 'design', 'architecture'
  ],
  'legal': [
    '法律', '弁護士', '司法書士', '行政書士', '法務', '相続', '離婚', '契約',
    'legal', 'lawyer', 'law', 'attorney', 'judicial', 'contract', 'court',
    '裁判', '訴訟', 'litigation', '権利', 'rights'
  ],
  'beauty': [
    '美容', 'エステ', 'サロン', 'スパ', 'ネイル', 'まつげ', 'ヘアー', '化粧品',
    'beauty', 'salon', 'spa', 'cosmetics', 'hair', 'nail', 'skincare', 'makeup',
    'ファッション', 'fashion', 'style', 'おしゃれ'
  ],
  'travel': [
    '旅行', '観光', 'ツアー', 'ホテル', '宿泊', '航空', '交通', 'リゾート',
    'travel', 'tourism', 'tour', 'hotel', 'flight', 'vacation', 'resort',
    '温泉', 'onsen', '海外', 'overseas', '国内', 'domestic'
  ]
};

// コンテンツタイプキーワードマッピング
const contentTypeKeywords: Record<string, string[]> = {
  'hero': [
    'トップページ', 'メインビジュアル', 'ヒーロー', 'キービジュアル', '企業紹介',
    'hero', 'main', 'top', 'welcome', 'introduction', 'overview', 'home'
  ],
  'about': [
    '会社概要', '企業情報', '私たちについて', '会社案内', '沿革', 'プロフィール',
    'about', 'company', 'profile', 'history', 'mission', 'vision', 'values',
    '理念', '使命', 'philosophy', 'organization'
  ],
  'service': [
    'サービス', '事業内容', '業務内容', 'ソリューション', '提供サービス',
    'service', 'solution', 'business', 'offering', 'what we do', 'services'
  ],
  'product': [
    '商品', '製品', 'プロダクト', '商品紹介', '製品情報', 'ラインナップ',
    'product', 'products', 'merchandise', 'goods', 'lineup', 'catalog'
  ],
  'team': [
    'チーム', 'メンバー', 'スタッフ', '社員', '代表', '役員', '人材',
    'team', 'staff', 'member', 'employee', 'people', 'executive', 'ceo'
  ],
  'testimonial': [
    'お客様の声', '事例', '実績', '導入事例', 'レビュー', '評価', '感想',
    'testimonial', 'review', 'case study', 'success', 'client', 'feedback',
    '導入実績', 'achievement', 'result'
  ],
  'news': [
    'ニュース', 'お知らせ', '最新情報', 'プレスリリース', '更新情報', 'ブログ',
    'news', 'blog', 'press', 'release', 'update', 'announcement', 'information'
  ],
  'contact': [
    'お問い合わせ', '連絡先', 'コンタクト', '相談', 'アクセス', '地図',
    'contact', 'inquiry', 'consultation', 'access', 'location', 'map', 'address'
  ],
  'pricing': [
    '料金', '価格', 'プラン', '費用', 'コスト', '見積もり', '料金表',
    'pricing', 'price', 'plan', 'cost', 'fee', 'estimate', 'quote'
  ],
  'faq': [
    'FAQ', 'よくある質問', 'Q&A', '質問', 'ヘルプ', 'サポート',
    'faq', 'question', 'help', 'support', 'answer', 'frequently asked'
  ]
};

// テキストから業界を推測
function detectIndustry(text: string): IndustryResult | null {
  const normalizedText = text.toLowerCase();
  const scores: Record<string, number> = {};
  
  // 各業界のスコアを計算
  Object.entries(industryKeywords).forEach(([industry, keywords]) => {
    scores[industry] = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        scores[industry] += matches.length;
      }
    });
  });
  
  // 最高スコアの業界を返す
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null;
  
  const detectedIndustry = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0];
  if (!detectedIndustry) return null;
  
  const confidence: 'high' | 'medium' | 'low' = maxScore > 2 ? 'high' : maxScore > 1 ? 'medium' : 'low';
  
  return {
    industry: detectedIndustry,
    confidence,
    score: maxScore
  };
}

// テキストからコンテンツタイプを推測
function detectContentTypes(text: string, url = ''): ContentTypeResult[] {
  const normalizedText = (text + ' ' + url).toLowerCase();
  const scores: Record<string, number> = {};
  
  // 各コンテンツタイプのスコアを計算
  Object.entries(contentTypeKeywords).forEach(([contentType, keywords]) => {
    scores[contentType] = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        scores[contentType] += matches.length;
      }
    });
  });
  
  // スコアが1以上のコンテンツタイプを返す（複数可）
  const detectedTypes = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 3) // 上位3つまで
    .map(([type, score]) => ({
      type,
      score,
      confidence: (score > 2 ? 'high' : score > 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
    }));
  
  return detectedTypes;
}

// URLパスからコンテンツタイプを推測
function detectContentTypeFromPath(url: string): ContentTypeResult | null {
  const path = url.toLowerCase();
  const pathSegments = path.split('/').filter(Boolean);
  
  const pathMappings: Record<string, string[]> = {
    'about': ['about', 'company', 'profile', '企業情報', '会社概要'],
    'service': ['service', 'services', 'business', 'solution', 'サービス'],
    'product': ['product', 'products', 'goods', '商品', '製品'],
    'team': ['team', 'staff', 'member', 'people', 'チーム', 'スタッフ'],
    'news': ['news', 'blog', 'press', 'ニュース', 'お知らせ'],
    'contact': ['contact', 'inquiry', 'access', 'お問い合わせ', '連絡先'],
    'pricing': ['pricing', 'price', 'plan', '料金', 'プラン'],
    'faq': ['faq', 'help', 'support', 'question', 'よくある質問']
  };
  
  for (const [contentType, keywords] of Object.entries(pathMappings)) {
    for (const keyword of keywords) {
      if (pathSegments.some(segment => segment.includes(keyword))) {
        return {
          type: contentType,
          confidence: 'high',
          source: 'url_path'
        };
      }
    }
  }
  
  return null;
}

// メタデータとコンテンツを分析
function analyzeContent(content: string, url = ''): AnalysisResult {
  logger.debug('Analyzing content for industry and content type detection');
  
  try {
    // テキストコンテンツから業界を推測
    const industryResult = detectIndustry(content);
    
    // URLパスからコンテンツタイプを推測
    const pathContentType = detectContentTypeFromPath(url);
    
    // テキストからコンテンツタイプを推測
    const textContentTypes = detectContentTypes(content, url);
    
    // 結果をマージ
    let finalContentTypes = textContentTypes;
    if (pathContentType) {
      // URLパスからの推測結果を優先
      finalContentTypes = [pathContentType, ...textContentTypes.filter(t => t.type !== pathContentType.type)];
    }
    
    const result: AnalysisResult = {
      industry: industryResult,
      contentTypes: finalContentTypes,
      analysis: {
        textLength: content.length,
        url,
        timestamp: new Date().toISOString()
      }
    };
    
    logger.info('Content analysis completed:', {
      industry: industryResult?.industry,
      confidence: industryResult?.confidence,
      contentTypesCount: finalContentTypes.length
    });
    
    return result;
    
  } catch (error) {
    logger.error('Content analysis failed:', error);
    return {
      industry: null,
      contentTypes: [],
      analysis: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

export {
  analyzeContent,
  detectIndustry,
  detectContentTypes,
  detectContentTypeFromPath
};