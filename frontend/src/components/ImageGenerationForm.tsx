import React, { useState } from 'react';
import { Loader2, Sparkles, Download, CheckCircle2, AlertCircle, ExternalLink, Maximize2 } from 'lucide-react';

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
const translateImageType = (type: string): string => {
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

const translateIndustry = (industry: string): string => {
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

const translateContentType = (type: string): string => {
  return contentTypeLabels[type.toLowerCase()] || type;
};

const ImageGenerationForm: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<any[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [analysisInfo, setAnalysisInfo] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [showApiKeyUpdate, setShowApiKeyUpdate] = useState<boolean>(false);
  const [newApiKey, setNewApiKey] = useState<string>('');

  // Vercelプロテクションバイパス用のヘッダー
  const getBypassHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (window.location.hostname.includes('vercel.app')) {
      headers['x-vercel-protection-bypass'] = 'bypass-65da4d54b53364a97e9f990337628188';
      headers['x-vercel-set-bypass-cookie'] = 'true';
    }

    return headers;
  };

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
        headers: getBypassHeaders(),
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
        headers: getBypassHeaders(),
        body: JSON.stringify({
          suggested_prompts: suggestedPrompts,
          industry: analysisData?.industry,
          url: url
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

  // 画像をダウンロード
  const handleDownload = (imageUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename || `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // モーダルで画像を表示
  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  // APIキーを更新
  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      setError('APIキーを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/emergency/update-api-key', {
        method: 'POST',
        headers: getBypassHeaders(),
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedPrompts.map((promptObj, index) => (
                <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {translateImageType(promptObj.type || promptObj.section || '画像')}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {promptObj.description || promptObj.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {img.description}
                      </p>
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
