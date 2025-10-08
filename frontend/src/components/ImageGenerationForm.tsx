import React, { useState, useCallback, useMemo } from 'react';
import { Loader2, Sparkles, Download, CheckCircle2, AlertCircle, ExternalLink, Maximize2 } from 'lucide-react';
import type {
  SuggestedPrompt,
  AnalysisData,
  GeneratedImageData,
  StyleLevel,
  ColorPalette
} from '../types';

// 画像タイプの日本語変換
const imageTypeLabels: Record<string, string> = {
  'hero': 'ヒーロー',
  'service': 'サービス',
  'about': '会社紹介',
  'team': 'チーム',
  'contact': 'お問い合わせ',
  'cta': '行動喚起',
  'feature': '特徴',
  'testimonial': 'お客様の声',
  'portfolio': 'ポートフォリオ',
  'background': '背景',
  'banner': 'バナー',
  'icon': 'アイコン',
  'logo': 'ロゴ',
  'product': '製品',
  'general': '一般'
};

// 英語のタイプを日本語に変換
const translateImageType = (type: string | undefined): string => {
  if (!type) return '画像';
  return imageTypeLabels[type.toLowerCase()] || type;
};

// 業界名の日本語変換
const industryLabels: Record<string, string> = {
  'consulting': 'コンサルティング',
  'technology': 'テクノロジー',
  'healthcare': '医療・ヘルスケア',
  'finance': '金融',
  'education': '教育',
  'retail': '小売',
  'real-estate': '不動産',
  'manufacturing': '製造業',
  'food': '飲食',
  'travel': '旅行・観光',
  'entertainment': 'エンターテインメント',
  'ecommerce': 'EC・オンラインショップ',
  'saas': 'SaaS・ソフトウェア',
  'agency': '代理店',
  'legal': '法律',
  'other': 'その他'
};

const translateIndustry = (industry: string | undefined): string => {
  if (!industry) return 'その他';
  return industryLabels[industry.toLowerCase()] || industry;
};

// コンテンツタイプの日本語変換
const contentTypeLabels: Record<string, string> = {
  'service': 'サービス紹介',
  'product': '商品紹介',
  'company': '企業紹介',
  'hero': 'ヒーロー',
  'about': '会社概要',
  'general': '一般'
};

const translateContentType = (type: string | undefined): string => {
  if (!type) return '一般';
  return contentTypeLabels[type.toLowerCase()] || type;
};

// 画像の配置場所と使用目的のガイダンス
const imageUsageGuide: Record<string, { placement: string; purpose: string; tips: string }> = {
  'hero': {
    placement: 'トップページの最上部（ファーストビュー）',
    purpose: '訪問者の注意を引き、サイトの第一印象を決定する重要な画像',
    tips: '画面幅いっぱいに表示し、キャッチコピーと組み合わせて使用すると効果的です'
  },
  'service': {
    placement: 'サービス紹介セクション',
    purpose: '提供するサービスや製品の内容を視覚的に伝える',
    tips: 'テキスト説明の横または上に配置し、サービスの特徴を直感的に理解できるようにします'
  },
  'about': {
    placement: '会社紹介・企業概要ページ',
    purpose: '企業の雰囲気や価値観、チームの様子を伝える',
    tips: 'About UsやCompanyセクションに配置し、信頼感と親近感を演出します'
  },
  'team': {
    placement: 'チーム紹介セクション',
    purpose: 'スタッフやチームメンバーの雰囲気を伝える',
    tips: 'メンバー紹介の背景やヘッダー画像として使用し、チームの一体感を表現します'
  },
  'contact': {
    placement: 'お問い合わせページ',
    purpose: '問い合わせを促し、親しみやすい雰囲気を作る',
    tips: 'お問い合わせフォームの上部や背景に配置し、気軽に連絡できる雰囲気を演出します'
  },
  'cta': {
    placement: '行動喚起（CTA）セクション',
    purpose: '資料請求や登録などの行動を促す',
    tips: 'ボタンの近くに配置し、ユーザーのアクションを後押しします'
  },
  'feature': {
    placement: '特徴・強みセクション',
    purpose: '製品やサービスの特徴を視覚的に強調する',
    tips: '各特徴の説明と一緒に配置し、差別化ポイントを明確にします'
  },
  'testimonial': {
    placement: 'お客様の声・実績紹介セクション',
    purpose: '信頼性を高め、導入事例や評価を視覚化する',
    tips: 'お客様の声の背景や実績数値と組み合わせて使用します'
  },
  'portfolio': {
    placement: '実績・作品紹介ページ',
    purpose: '過去の実績や作品を魅力的に見せる',
    tips: 'グリッド形式で複数配置し、ポートフォリオギャラリーを作成します'
  },
  'background': {
    placement: 'セクションの背景',
    purpose: 'ページ全体の雰囲気を統一し、視覚的な階層を作る',
    tips: '薄く透過させてテキストの背景として使用すると効果的です'
  },
  'banner': {
    placement: 'ページ上部のバナーエリア',
    purpose: 'キャンペーンや重要な情報を目立たせる',
    tips: '期間限定のお知らせやキャンペーン告知に使用します'
  },
  'icon': {
    placement: 'サービス説明やメニューアイコン',
    purpose: '視覚的な識別子として機能を表現する',
    tips: '小さいサイズで使用し、テキストラベルと組み合わせます'
  },
  'logo': {
    placement: 'ヘッダーやフッター',
    purpose: 'ブランドアイデンティティを表現する',
    tips: 'ナビゲーションバーの左上に配置するのが一般的です'
  },
  'product': {
    placement: '商品紹介ページ',
    purpose: '商品の魅力や特徴を視覚的に伝える',
    tips: '複数の角度や使用シーンを見せると効果的です'
  },
  'general': {
    placement: '汎用的に使用可能',
    purpose: 'コンテンツを補完し、視覚的な魅力を高める',
    tips: 'テキストの間に挿入して読みやすさを向上させます'
  }
};

const getImageUsageGuide = (type: string | undefined) => {
  if (!type) {
    return {
      placement: '適切なセクションに配置',
      purpose: 'コンテンツを視覚的に補完する',
      tips: 'ページの目的に合わせて最適な場所に配置してください'
    };
  }
  return imageUsageGuide[type.toLowerCase()] || {
    placement: '適切なセクションに配置',
    purpose: 'コンテンツを視覚的に補完する',
    tips: 'ページの目的に合わせて最適な場所に配置してください'
  };
};

const ImageGenerationForm: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageData[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPrompt[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string>('');
  const [analysisInfo, setAnalysisInfo] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [showApiKeyUpdate, setShowApiKeyUpdate] = useState<boolean>(false);
  const [newApiKey, setNewApiKey] = useState<string>('');

  // 画像生成設定
  const [selectedStyleLevel, setSelectedStyleLevel] = useState<StyleLevel>('standard');
  const [selectedColorPalette, setSelectedColorPalette] = useState<ColorPalette>('vibrant');

  // Vercelプロテクションバイパス用のヘッダー (useMemo for performance)
  const bypassHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (window.location.hostname.includes('vercel.app')) {
      headers['x-vercel-protection-bypass'] = 'bypass-65da4d54b53364a97e9f990337628188';
      headers['x-vercel-set-bypass-cookie'] = 'true';
    }

    return headers;
  }, []);

  // URLを分析
  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setSuccess('');
    setAnalysisInfo('');
    setProgress(0);

    // プログレスバーアニメーション
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const response = await fetch('/api/analyze-with-playwright', {
        method: 'POST',
        headers: bypassHeaders,
        body: JSON.stringify({
          url,
          generateImage: false
        })
      });

      // レスポンスのテキストを取得
      const text = await response.text();

      // 空のレスポンスチェック
      if (!text) {
        throw new Error('サーバーから空のレスポンスが返されました。APIキーまたは環境変数を確認してください。');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error:', text);
        throw new Error(`レスポンスの解析に失敗: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        // エラーメッセージを日本語に変換
        let errorMessage = data.error || `URL解析に失敗しました (${response.status})`;
        
        // OAuth認証エラーの場合
        if (data.error && (data.error.includes('OAuth token has expired') || data.error.includes('authentication_error'))) {
          errorMessage = 'APIキーが期限切れです。管理者にお問い合わせください。';
        }
        // その他の英語エラーメッセージを日本語に変換
        else if (data.error) {
          if (data.error.includes('API key') || data.error.includes('API_KEY')) {
            errorMessage = 'APIキーが無効です。環境変数の設定を確認してください。';
          } else if (data.error.includes('rate limit')) {
            errorMessage = 'APIの使用量制限に達しました。しばらく待ってから再度お試しください。';
          } else if (data.error.includes('quota')) {
            errorMessage = 'APIのクレジットが不足しています。';
          } else if (data.error.includes('timeout')) {
            errorMessage = 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。';
          } else if (data.error.includes('network') || data.error.includes('connection')) {
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          }
        }
        
        throw new Error(errorMessage);
      }

      if (data.success) {
        setSuggestedPrompts(data.suggested_prompts || []);
        setAnalysisData(data);

        // 推奨設定を自動選択
        if (data.recommended_style_level) {
          setSelectedStyleLevel(data.recommended_style_level);
        }
        if (data.recommended_color_palette) {
          setSelectedColorPalette(data.recommended_color_palette);
        }

        // 分析情報を表示
        const info = [];
        if (data.industry) info.push(`業界: ${translateIndustry(data.industry)}`);
        if (data.content_type) info.push(`タイプ: ${translateContentType(data.content_type)}`);
        if (data.suggested_prompts && data.suggested_prompts.length > 0) {
          info.push(`画像候補: ${data.suggested_prompts.length}箇所`);
        }
        if (data.from_cache) info.push('(キャッシュから取得)');

        setAnalysisInfo(info.join(' / '));
        setSuccess(`URL分析が完了しました！${data.suggested_prompts?.length || 0}箇所の画像候補を検出`);
        setProgress(100);
      }
    } catch (err) {
      console.error('Analysis Error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // すべての画像を生成
  const handleGenerateAll = async () => {
    if (!suggestedPrompts || suggestedPrompts.length === 0) {
      setError('生成する画像候補がありません');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');
    setProgress(0);
    setGeneratedImages([]);

    // プログレスバーアニメーション
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 3, 90));
    }, 800);

    try {
      const response = await fetch('/api/generate-all-images', {
        method: 'POST',
        headers: bypassHeaders,
        body: JSON.stringify({
          suggested_prompts: suggestedPrompts,
          industry: analysisData?.industry,
          url: url,
          company_info: analysisData?.company_info,
          existing_images: analysisData?.existing_images,
          style_level: selectedStyleLevel,
          color_palette: selectedColorPalette
        })
      });

      const text = await response.text();

      if (!text) {
        throw new Error('サーバーから空のレスポンスが返されました');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error:', text);
        throw new Error(`レスポンスの解析に失敗: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        // エラーメッセージを日本語に変換
        let errorMessage = data.error || `画像生成に失敗しました (${response.status})`;
        
        // OAuth認証エラーの場合
        if (data.error && (data.error.includes('OAuth token has expired') || data.error.includes('authentication_error'))) {
          errorMessage = 'APIキーが期限切れです。管理者にお問い合わせください。';
        }
        // その他の英語エラーメッセージを日本語に変換
        else if (data.error) {
          if (data.error.includes('API key') || data.error.includes('API_KEY')) {
            errorMessage = 'APIキーが無効です。環境変数の設定を確認してください。';
          } else if (data.error.includes('rate limit')) {
            errorMessage = 'APIの使用量制限に達しました。しばらく待ってから再度お試しください。';
          } else if (data.error.includes('quota')) {
            errorMessage = 'APIのクレジットが不足しています。';
          } else if (data.error.includes('timeout')) {
            errorMessage = 'リクエストがタイムアウトしました。しばらく待ってから再度お試しください。';
          } else if (data.error.includes('network') || data.error.includes('connection')) {
            errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          }
        }
        
        throw new Error(errorMessage);
      }

      if (data.success && data.images) {
        setGeneratedImages(data.images);
        setSuccess(`${data.images.length}枚の画像生成が完了しました！`);
        setProgress(100);
      }
    } catch (err) {
      console.error('Generation Error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  // 画像をダウンロード (useCallback for performance)
  const handleDownload = useCallback((imageUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // モーダルで画像を表示 (useCallback for performance)
  const openImageModal = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  }, []);

  // APIキーを更新
  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('APIキーを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/emergency/update-api-key', {
        method: 'POST',
        headers: bypassHeaders,
        body: JSON.stringify({ apiKey: newApiKey })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('APIキーが正常に更新されました！');
        setShowApiKeyUpdate(false);
        setNewApiKey('');
        setError('');
      } else {
        setError(data.error || 'APIキーの更新に失敗しました');
      }
    } catch (err) {
      setError('APIキーの更新中にエラーが発生しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      {progress > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {isAnalyzing ? 'URL分析中...' : '画像生成中...'}
            </span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 成功メッセージ */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-slide-down">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-slide-down">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            {error.includes('APIキーが期限切れ') && (
              <button
                onClick={() => setShowApiKeyUpdate(true)}
                className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
              >
                APIキーを更新
              </button>
            )}
          </div>
        </div>
      )}

      {/* URL入力セクション */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              ウェブサイトURL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all"
                disabled={isAnalyzing}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !url.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    分析中
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    分析
                  </>
                )}
              </button>
            </div>
          </div>

          {analysisInfo && (
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>{analysisInfo}</span>
            </div>
          )}
        </div>
      </div>

      {/* 画像生成設定（自動選択+編集可能） */}
      {suggestedPrompts.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 shadow-sm animate-slide-down">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            画像生成設定
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* スタイルレベル選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                スタイルレベル
                {analysisData?.style_level_reasoning && (
                  <span className="ml-2 text-xs font-normal text-purple-600">
                    (AI推奨)
                  </span>
                )}
              </label>
              <select
                value={selectedStyleLevel}
                onChange={(e) => setSelectedStyleLevel(e.target.value as StyleLevel)}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              >
                <option value="standard">Standard - シンプルでクリーン</option>
                <option value="premium">Premium - 洗練されたプロフェッショナル</option>
                <option value="luxury">Luxury - 最高級の質感とライティング</option>
              </select>
              {analysisData?.style_level_reasoning && (
                <p className="mt-1 text-xs text-gray-600">
                  💡 {analysisData.style_level_reasoning}
                </p>
              )}
            </div>

            {/* カラーパレット選択 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                カラーパレット
                {analysisData?.color_palette_reasoning && (
                  <span className="ml-2 text-xs font-normal text-purple-600">
                    (AI推奨)
                  </span>
                )}
              </label>
              <select
                value={selectedColorPalette}
                onChange={(e) => setSelectedColorPalette(e.target.value as ColorPalette)}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900"
              >
                <option value="vibrant">Vibrant - 鮮やかで活気のある色</option>
                <option value="muted">Muted - 落ち着いた高級感のある色</option>
                <option value="monochrome">Monochrome - モノクロ・グレースケール</option>
                <option value="corporate">Corporate - 企業向けカラー</option>
              </select>
              {analysisData?.color_palette_reasoning && (
                <p className="mt-1 text-xs text-gray-600">
                  💡 {analysisData.color_palette_reasoning}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 画像候補一覧とすべて生成 */}
      {suggestedPrompts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow animate-slide-down">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                検出された画像候補 ({suggestedPrompts.length}箇所)
              </h3>
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    すべて生成
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {suggestedPrompts.map((promptObj, index) => {
                const guide = getImageUsageGuide(promptObj.type || promptObj.section || 'general');
                return (
                  <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {translateImageType(promptObj.type || promptObj.section || '画像')}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            {promptObj.description || promptObj.prompt}
                          </p>
                        </div>
                        <div className="bg-white/60 border border-blue-200 rounded-md p-2 space-y-1 text-xs">
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-blue-900 whitespace-nowrap">📍</span>
                            <span className="text-gray-700">{guide.placement}</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-blue-900 whitespace-nowrap">🎯</span>
                            <span className="text-gray-700">{guide.purpose}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* 複数画像の生成結果 */}
      {generatedImages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow animate-slide-down">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                生成結果 ({generatedImages.length}枚)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((img, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-all hover:shadow-lg">
                  <div className="relative aspect-square bg-white cursor-pointer group" onClick={() => openImageModal(img.image)}>
                    <img
                      src={img.image}
                      alt={img.description || `Generated image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        {translateImageType(img.type || img.section || '画像')}
                      </h4>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {img.description}
                      </p>

                      {/* 配置場所と使用目的のガイダンス */}
                      {(() => {
                        const guide = getImageUsageGuide(img.type || img.section || 'general');
                        return (
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3 space-y-2 text-xs">
                            <div>
                              <span className="font-semibold text-indigo-900">📍 配置場所：</span>
                              <p className="text-gray-700 mt-0.5">{guide.placement}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-indigo-900">🎯 使用目的：</span>
                              <p className="text-gray-700 mt-0.5">{guide.purpose}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-indigo-900">💡 活用のコツ：</span>
                              <p className="text-gray-700 mt-0.5">{guide.tips}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => handleDownload(img.image, `${img.type || 'image'}-${index + 1}.png`)}
                      className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      ダウンロード
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 使い方ガイド */}
      {!suggestedPrompts.length && !generatedImages.length && !isAnalyzing && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            使い方
          </h3>
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>ウェブサイトのURLを入力して「分析」ボタンをクリック</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>システムが自動的にページ全体を分析し、必要な画像箇所を検出</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>「すべて生成」ボタンで全画像を一括生成</span>
            </li>
          </ol>
        </div>
      )}

      {/* APIキー更新モーダル */}
      {showApiKeyUpdate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowApiKeyUpdate(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">APIキーを更新</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  新しいGemini APIキー
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="AIzaSyC..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateApiKey}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  更新
                </button>
                <button
                  onClick={() => setShowApiKeyUpdate(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像拡大モーダル */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={selectedImage}
              alt="Generated - Full Size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-2 transition-all shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationForm;
