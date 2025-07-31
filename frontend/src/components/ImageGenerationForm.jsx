import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Wand2, Loader2, Download, Edit3, DollarSign, Palette, Sparkles, X, Save, History } from 'lucide-react';
import ImageGallery from './ImageGallery';
import logger from '../utils/logger';

const ImageGenerationForm = () => {
  const [prompt, setPrompt] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState(['']); // 追加の指示文
  const [url, setUrl] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'url'
  const [context, setContext] = useState({
    industry: '',
    contentType: ''
  });
  const [selectedContentTypes, setSelectedContentTypes] = useState([]); // 複数選択用
  const [selectedApi, setSelectedApi] = useState('auto');
  const [numberOfImages, setNumberOfImages] = useState(1); // 生成枚数
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');
  const [availableApis, setAvailableApis] = useState([]);
  const [promptAnalysis, setPromptAnalysis] = useState(null);
  const [totalCost, setTotalCost] = useState(0);
  const [urlContent, setUrlContent] = useState(null);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isDetailedAnalysis, setIsDetailedAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // APIの可用性をチェック
  useEffect(() => {
    fetchAvailableApis();
  }, []);

  const fetchAvailableApis = async () => {
    try {
      const response = await fetch('/api/apis/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      setAvailableApis(data.available || []);
    } catch (err) {
      logger.error('Failed to fetch available APIs:', err);
    }
  };


  // プロンプト解析（デバウンス付き）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (prompt.length > 10) {
        analyzePrompt();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [prompt, context]);
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // 保留中のリクエストをキャンセル
      // メモリリークを防ぐ
    };
  }, []);

  const analyzePrompt = async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          context
        })
      });
      const data = await response.json();
      if (data.success) {
        setPromptAnalysis(data.analysis);
      }
    } catch (err) {
      logger.error('Prompt analysis failed:', err);
    }
  };

  // URLからコンテンツを解析
  const analyzeUrl = async (detailed = false) => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setIsAnalyzingUrl(true);
    setIsDetailedAnalysis(detailed);
    setError('');
    setAnalysisProgress(0);
    setDetailedAnalysis(null);

    try {
      if (detailed) {
        // 詳細解析
        const response = await fetch('/api/analyze-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, detailed: true })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'サイト解析に失敗しました');
        }

        if (data.success) {
          setDetailedAnalysis(data);
          setPrompt(data.suggested_prompt);
          setContext({
            industry: data.industry || '',
            contentType: 'hero'
          });
          
          // テーマやスタイル情報を反映
          if (data.visual_style) {
            setPromptAnalysis(prev => ({
              ...prev,
              style_suggestions: data.visual_style.atmosphere || [],
              color_palette: data.visual_style.color_hints || [],
              themes: data.main_themes || []
            }));
          }
          
        }
        setIsAnalyzingUrl(false);
        
      } else {
        // 単純解析（新しい自動推測機能付き）
        const response = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'URL解析に失敗しました');
        }

        if (data.success) {
          setUrlContent(data.content);
          setPrompt(data.suggested_prompt);
          
          // 自動推測された業界とコンテンツタイプを設定
          setContext({
            industry: data.industry || '',
            contentType: data.content_type || 'hero'
          });

          // 複数のコンテンツタイプが検出された場合は自動選択
          if (data.detected_content_types && data.detected_content_types.length > 0) {
            setSelectedContentTypes(data.detected_content_types.slice(0, 3)); // 上位3つまで自動選択
          }

          // 分析結果をプロンプト解析に反映
          if (data.analysis) {
            setPromptAnalysis(prev => ({
              ...prev,
              industry_confidence: data.analysis.industry_confidence,
              detected_themes: data.analysis.content_types_detected?.map(ct => ct.type) || [],
              analysis_method: data.analysis.analysis_method
            }));
          }
        }
        setIsAnalyzingUrl(false);
      }
    } catch (err) {
      setError(err.message || 'URL解析に失敗しました');
      setIsAnalyzingUrl(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('メインの指示文を入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // エンドポイント選択
      const endpoint = numberOfImages > 1 ? '/api/generate/batch' : '/api/generate';
      
      const requestPayload = {
        prompt: prompt, // メインプロンプトのみ送信
        additionalInstructions: additionalInstructions.filter(inst => inst.trim()), // 日本語の追加指示を別途送信
        api: selectedApi,
        count: numberOfImages,
        context: {
          industry: context.industry,
          contentType: selectedContentTypes.length > 0 ? selectedContentTypes.join(',') : context.contentType,
          contentTypes: selectedContentTypes, // 複数選択の配列も送信
          source_url: inputMode === 'url' ? url : undefined,
          locale: 'ja-JP', // 日本向け設定
          style_preferences: {
            ethnicity: 'japanese',
            cultural_context: 'japan',
            text_language: 'japanese'
          }
        },
        options: {}
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      let data;
      
      // レスポンスの処理
      try {
        data = await response.json();
      } catch (parseError) {
        // JSONパースエラーの場合
        logger.error('API Response Parse Error:', parseError);
        
        // body stream already read エラーの場合
        if (parseError.message.includes('body stream already read')) {
          throw new Error('レスポンス処理エラー。再度お試しください。');
        }
        
        throw new Error(`Server error: ${response.status} - ${parseError.message}`);
      }

      if (!response.ok) {
        // エラーレスポンスの詳細を表示
        logger.error('API Error Details:', data);
        throw new Error(data.details || data.error || 'Generation failed');
      }

      if (data.success) {
        // 単一画像の場合
          if (numberOfImages === 1) {
            const newImage = {
              id: Date.now(),
              src: data.image,
              prompt: data.metadata.original_prompt,
              enhancedPrompt: data.metadata.enhanced_prompt,
              api: data.metadata.api_used,
              cost: data.metadata.cost,
              analysis: data.metadata.analysis
            };
            setGeneratedImages([...generatedImages, newImage]);
            setTotalCost(totalCost + data.metadata.cost);
            
            saveImageToHistory(newImage);
          } else {
            // 複数画像の場合
            const newImages = data.images.map((img, index) => ({
              id: Date.now() + index,
              src: img.image,
              prompt: img.metadata.original_prompt,
              enhancedPrompt: img.metadata.enhanced_prompt,
              api: img.metadata.api_used,
              cost: img.metadata.cost,
              analysis: img.metadata.analysis
            }));
            setGeneratedImages([...generatedImages, ...newImages]);
            setTotalCost(totalCost + data.total_cost);
            
            newImages.forEach(img => saveImageToHistory(img));
          }
        
        // プロンプトをクリアしない（追加生成を可能にする）
        // setPrompt('');
        // setAdditionalInstructions(['']);
      }
    } catch (err) {
      setError(err.message || '画像生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 画像を履歴に保存
  const saveImageToHistory = async (image) => {
    try {
      const response = await fetch('/api/images/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': 'default' // 今後ユーザー認証を追加可能
        },
        body: JSON.stringify({
          image: image.src,
          metadata: {
            prompt: image.prompt,
            enhancedPrompt: image.enhancedPrompt,
            api: image.api,
            cost: image.cost,
            analysis: image.analysis
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // デモ画像は保存しない
        if (!data.imageId) {
          return;
        }
        
        // ローカルストレージにも保存（KVが使えない場合のフォールバック）
        if (data.warning) {
          try {
            const localHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');
            // 画像データを保存せず、メタデータのみ保存
            localHistory.unshift({
              id: data.imageId,
              // 画像は保存しない（容量節約）
              metadata: {
                prompt: image.prompt,
                enhancedPrompt: image.enhancedPrompt,
                api: image.api,
                cost: image.cost,
                createdAt: new Date().toISOString()
              }
            });
            // 最大20件まで保存（容量節約）
            if (localHistory.length > 20) {
              localHistory.pop();
            }
            localStorage.setItem('imageHistory', JSON.stringify(localHistory));
          } catch (storageError) {
            logger.warn('LocalStorage保存エラー:', storageError);
            // 容量エラーの場合は履歴をクリア
            if (storageError.name === 'QuotaExceededError') {
              localStorage.removeItem('imageHistory');
            }
          }
        }
      }
    } catch (err) {
      logger.error('画像保存エラー:', err);
      
      // エラー時もローカルストレージに保存（メタデータのみ）
      try {
        const localHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');
        localHistory.unshift({
          id: 'local-' + Date.now(),
          // 画像は保存しない（容量節約）
          metadata: {
            prompt: image.prompt,
            enhancedPrompt: image.enhancedPrompt,
            api: image.api,
            cost: image.cost,
            createdAt: new Date().toISOString()
          }
        });
        if (localHistory.length > 20) {
          localHistory.pop();
        }
        localStorage.setItem('imageHistory', JSON.stringify(localHistory));
      } catch (storageError) {
        logger.warn('LocalStorage保存エラー:', storageError);
        if (storageError.name === 'QuotaExceededError') {
          localStorage.removeItem('imageHistory');
        }
      }
    }
  };

  // 履歴を取得
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/images/history', {
        headers: {
          'X-User-Id': 'default'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        if (data.images.length > 0) {
          setImageHistory(data.images);
        } else if (data.warning) {
          // KVが使えない場合はローカルストレージから取得
          const localHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');
          setImageHistory(localHistory);
        }
      }
    } catch (err) {
      logger.error('履歴取得エラー:', err);
      // エラー時はローカルストレージから取得
      const localHistory = JSON.parse(localStorage.getItem('imageHistory') || '[]');
      setImageHistory(localHistory);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 履歴から画像をロード
  const loadFromHistory = (historyImage) => {
    const loadedImage = {
      id: Date.now(),
      src: historyImage.image,
      prompt: historyImage.metadata.prompt,
      enhancedPrompt: historyImage.metadata.enhancedPrompt,
      api: historyImage.metadata.api,
      cost: historyImage.metadata.cost,
      analysis: historyImage.metadata.analysis
    };
    setGeneratedImages([...generatedImages, loadedImage]);
    setTotalCost(totalCost + loadedImage.cost);
    setShowHistory(false);
  };

  // 追加の指示文を追加
  const addInstruction = (preset = '') => {
    if (preset) {
      setAdditionalInstructions([...additionalInstructions, preset]);
    } else {
      setAdditionalInstructions([...additionalInstructions, '']);
    }
  };

  // 指示文を更新
  const updateInstruction = (index, value) => {
    const updated = [...additionalInstructions];
    updated[index] = value;
    setAdditionalInstructions(updated);
  };

  // 指示文を削除
  const removeInstruction = (index) => {
    const updated = additionalInstructions.filter((_, i) => i !== index);
    setAdditionalInstructions(updated.length > 0 ? updated : ['']);
  };

  const handleEdit = (image) => {
    // 編集機能は未実装
  };

  const handleDownload = (imageSrc, filename) => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename || 'generated-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const industries = [
    { value: '', label: '業界を選択' },
    { value: 'technology', label: 'IT・テクノロジー' },
    { value: 'healthcare', label: '医療・ヘルスケア' },
    { value: 'education', label: '教育・学習' },
    { value: 'restaurant', label: '飲食・グルメ' },
    { value: 'fashion', label: 'ファッション・アパレル' },
    { value: 'finance', label: '金融・保険' },
    { value: 'realestate', label: '不動産・建設' },
    { value: 'retail', label: '小売・流通' },
    { value: 'manufacturing', label: '製造業' },
    { value: 'automotive', label: '自動車・運輸' },
    { value: 'beauty', label: '美容・コスメ' },
    { value: 'sports', label: 'スポーツ・フィットネス' },
    { value: 'entertainment', label: 'エンターテインメント' },
    { value: 'travel', label: '旅行・観光' },
    { value: 'hospitality', label: 'ホテル・宿泊' },
    { value: 'legal', label: '法務・士業' },
    { value: 'consulting', label: 'コンサルティング' },
    { value: 'agriculture', label: '農業・食品' },
    { value: 'energy', label: 'エネルギー・環境' },
    { value: 'nonprofit', label: 'NPO・非営利' },
    { value: 'government', label: '政府・公共機関' },
    { value: 'media', label: 'メディア・出版' },
    { value: 'telecommunications', label: '通信・ネットワーク' },
    { value: 'logistics', label: '物流・配送' },
    { value: 'ecommerce', label: 'EC・オンライン販売' },
    { value: 'other', label: 'その他' }
  ];

  const contentTypes = [
    { value: '', label: 'コンテンツタイプを選択（複数選択可）' },
    { value: 'hero', label: 'ヒーローイメージ', description: 'トップページのメインビジュアル' },
    { value: 'about', label: '会社紹介', description: '企業理念やビジョンを伝える' },
    { value: 'service', label: 'サービス紹介', description: '提供サービスの特徴' },
    { value: 'product', label: '商品紹介', description: '製品の魅力を訴求' },
    { value: 'team', label: 'チーム紹介', description: 'スタッフや組織の紹介' },
    { value: 'testimonial', label: 'お客様の声', description: '顧客の成功事例' },
    { value: 'feature', label: '機能紹介', description: '特定機能の説明' },
    { value: 'benefit', label: 'ベネフィット', description: '顧客の得られる価値' },
    { value: 'process', label: 'プロセス説明', description: 'サービスの流れ' },
    { value: 'gallery', label: 'ギャラリー', description: '作品集や事例集' },
    { value: 'contact', label: 'コンタクト', description: 'お問い合わせセクション' },
    { value: 'cta', label: 'CTA', description: 'アクションを促す' },
    { value: 'news', label: 'ニュース', description: '最新情報やお知らせ' },
    { value: 'event', label: 'イベント', description: 'セミナーや展示会' },
    { value: 'career', label: '採用情報', description: '求人・キャリア' },
    { value: 'background', label: '背景画像', description: 'セクション背景用' },
    { value: 'icon', label: 'アイコン', description: 'サービスや機能のアイコン' },
    { value: 'banner', label: 'バナー', description: 'キャンペーンや広告' },
    { value: 'infographic', label: 'インフォグラフィック', description: 'データの視覚化' },
    { value: 'other', label: 'その他', description: '上記以外の用途' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-purple-100">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-800">
                  AI画像生成システム
                </h1>
                <p className="text-gray-600">
                  ホームページ制作に最適な画像を生成・編集
                </p>
              </div>
            </div>
            
            {/* ボタンコントロール */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => {
                  setShowHistory(true);
                  loadHistory();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                生成履歴
              </button>
            </div>
          </div>


          {/* メインフォーム */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 業界選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  業界
                </label>
                <select
                  value={context.industry}
                  onChange={(e) => setContext({...context, industry: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {industries.map(ind => (
                    <option key={ind.value} value={ind.value}>{ind.label}</option>
                  ))}
                </select>
              </div>

              {/* コンテンツタイプ選択（複数選択） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コンテンツタイプ（複数選択可）
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {contentTypes.slice(1).map(type => (
                    <label key={type.value} className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedContentTypes.includes(type.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContentTypes([...selectedContentTypes, type.value]);
                          } else {
                            setSelectedContentTypes(selectedContentTypes.filter(t => t !== type.value));
                          }
                        }}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{type.label}</div>
                        {type.description && (
                          <div className="text-sm text-gray-500">{type.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                {selectedContentTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedContentTypes.map(type => {
                      const contentType = contentTypes.find(ct => ct.value === type);
                      return (
                        <span key={type} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                          {contentType?.label}
                          <button
                            onClick={() => setSelectedContentTypes(selectedContentTypes.filter(t => t !== type))}
                            className="ml-2 text-purple-600 hover:text-purple-900"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 入力モード切り替え */}
            <div className="mb-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMode === 'text' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  テキストで指定
                </button>
                <button
                  onClick={() => setInputMode('url')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMode === 'url' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ホームページURLから生成
                </button>
              </div>

              {/* URL入力セクション */}
              {inputMode === 'url' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ホームページURL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.jp"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => analyzeUrl(true)}
                      disabled={isAnalyzingUrl || !url.trim()}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAnalyzingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {analysisProgress}%
                        </>
                      ) : (
                        'URL解析'
                      )}
                    </button>
                  </div>
                  {urlContent && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium text-blue-900">✅ サイト解析完了・自動設定済み</p>
                      <p className="text-blue-700">{urlContent.title}</p>
                      {context.industry && (
                        <div className="mt-2 space-y-1">
                          <p className="text-blue-600">
                            🏢 推測業界: <span className="font-semibold">{
                              industries.find(ind => ind.value === context.industry)?.label || context.industry
                            }</span>
                          </p>
                          {selectedContentTypes.length > 0 && (
                            <p className="text-blue-600">
                              📋 推測コンテンツタイプ: <span className="font-semibold">
                                {selectedContentTypes.map(type => 
                                  contentTypes.find(ct => ct.value === type)?.label || type
                                ).join(', ')}
                              </span>
                            </p>
                          )}
                          {promptAnalysis?.industry_confidence && (
                            <p className="text-blue-500 text-xs">
                              信頼度: {promptAnalysis.industry_confidence === 'high' ? '高' : 
                                      promptAnalysis.industry_confidence === 'medium' ? '中' : '低'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {detailedAnalysis && (
                    <div className="mt-3 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">詳細解析結果</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-purple-800">解析ページ数:</span>
                          <span className="text-purple-700 ml-2">
                            {detailedAnalysis.pages_analyzed}ページ / {detailedAnalysis.pages_found}ページ発見
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-purple-800">業界確実度:</span>
                          <span className="text-purple-700 ml-2">
                            {detailedAnalysis.industry_confidence === 'high' ? '高' : 
                             detailedAnalysis.industry_confidence === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                        {detailedAnalysis.main_themes && detailedAnalysis.main_themes.length > 0 && (
                          <div>
                            <span className="font-medium text-purple-800">主要テーマ:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {detailedAnalysis.main_themes.map((theme, idx) => (
                                <span key={idx} className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {detailedAnalysis.visual_style && (
                          <div>
                            <span className="font-medium text-purple-800">推奨スタイル:</span>
                            <span className="text-purple-700 ml-2">
                              {detailedAnalysis.visual_style.tone}
                              {detailedAnalysis.visual_style.atmosphere.length > 0 && 
                                ` (${detailedAnalysis.visual_style.atmosphere.join(', ')})`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 指示文入力 */}
            <div className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メインの指示文
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="生成したい画像のメインとなる指示を入力してください..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {/* 追加の指示文 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    追加の指示文（日本語で入力可）
                  </label>
                  <button
                    type="button"
                    onClick={addInstruction}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    + 指示を追加
                  </button>
                </div>
                
                {/* よく使う指示文のプリセット */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => addInstruction('高品質で写実的な画像')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    高品質
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('明るく清潔感のある雰囲気')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    明るい雰囲気
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('プロフェッショナルな印象')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    プロフェッショナル
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('信頼感のあるデザイン')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    信頼感
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('モダンでスタイリッシュ')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    モダン
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('温かみのある雰囲気')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    温かみ
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('ミニマリストデザイン')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    ミニマル
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('日本的な美意識')}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    和風
                  </button>
                </div>
                
                {additionalInstructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder={`追加の指示 ${index + 1}（例：明るい雰囲気で、プロフェッショナルな印象）`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {additionalInstructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* プロンプト解析結果 */}
            {promptAnalysis && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  プロンプト解析
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">推奨スタイル:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {promptAnalysis.style_suggestions.map((style, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white rounded text-purple-600">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">カラーパレット:</span>
                    <div className="flex gap-2 mt-1">
                      {promptAnalysis.color_palette.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API選択と生成設定 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API選択
                </label>
                <select
                  value={selectedApi}
                  onChange={(e) => setSelectedApi(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="auto">自動選択（最適なAPIを自動判定）</option>
                  {availableApis.map(api => (
                    <option key={api} value={api}>{api.toUpperCase()}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  自動選択：コンテンツに最適なAPIを自動で選びます
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  生成枚数
                </label>
                <select
                  value={numberOfImages}
                  onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="1">1枚</option>
                  <option value="2">2枚</option>
                  <option value="3">3枚</option>
                  <option value="4">4枚</option>
                  <option value="5">5枚</option>
                  <option value="6">6枚</option>
                  <option value="7">7枚</option>
                  <option value="8">8枚</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  最大8枚まで同時生成可能です
                </p>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full px-8 py-3 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {numberOfImages > 1 ? `${numberOfImages}枚生成中...` : '生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {numberOfImages > 1 ? `${numberOfImages}枚生成` : '画像を生成'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-800 font-semibold mb-2">エラーが発生しました</h3>
                <p className="text-red-700">{error}</p>
                {error.includes('クレジット') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm">
                      <strong>解決方法:</strong>
                    </p>
                    <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                      <li><a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer" className="underline">Replicateアカウント</a>にアクセス</li>
                      <li>クレジットを購入（最低$5から）</li>
                      <li>購入後、数分待ってから再度お試しください</li>
                    </ol>
                    <p className="mt-2 text-xs text-yellow-600">
                      代替案: OpenAIまたはStability AIのAPIを使用することもできます
                    </p>
                  </div>
                )}
                {!error.includes('クレジット') && (
                  <>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 text-sm">詳細を表示</summary>
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {error}
                      </pre>
                    </details>
                    <p className="mt-3 text-sm text-red-600">
                      Vercelのログを確認するか、APIキーが正しく設定されているか確認してください。
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* コスト表示 */}
          {totalCost > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="font-semibold">総コスト:</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                ${totalCost.toFixed(4)}
              </span>
            </div>
          )}

          {/* 生成された画像 */}
          {generatedImages.length > 0 && (
            <div className="bg-gray-50/50 rounded-2xl p-8">
              <ImageGallery 
                images={generatedImages}
                onEdit={handleEdit}
                onDownload={handleDownload}
              />
            </div>
          )}
        </div>
      </div>


      {/* 履歴モーダル */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <History className="w-6 h-6" />
                生成履歴
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : imageHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageHistory.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.metadata.prompt}
                          className="w-full h-48 object-cover cursor-pointer"
                          onClick={() => loadFromHistory(item)}
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                          <p className="text-sm">画像データなし</p>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {item.metadata.prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{item.metadata.api}</span>
                          <span>{new Date(item.metadata.createdAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                        {item.image && (
                          <button
                            onClick={() => loadFromHistory(item)}
                            className="mt-2 w-full px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                          >
                            この画像を使用
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">まだ生成履歴がありません</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ImageGenerationForm;