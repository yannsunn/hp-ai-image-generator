import React, { useState, useEffect, ChangeEvent } from 'react';
import { Wand2, Loader2, DollarSign, Sparkles, X, History } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ImageGallery from './ImageGallery';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import logger from '../utils/logger';
import {
  GeneratedImage,
  Industry,
  ContentType,
  Context,
  PromptAnalysis,
  UrlContent,
  DetailedAnalysis,
  ImageHistory,
  GenerationResponse,
  AnalysisResponse,
  SaveImageResponse,
  HistoryResponse
} from '../types/index';

const ImageGenerationForm: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState<string[]>(['']); // 追加の指示文
  const [url, setUrl] = useState<string>('');
  const [inputMode, setInputMode] = useState<'text' | 'url'>('url'); // 'text' or 'url' - デフォルトをURLに変更

  // Vercelプロテクションバイパス用のヘッダーを生成
  const getBypassHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // プロダクション環境でのバイパストークン設定
    if (window.location.hostname === 'hp-ai-gen.vercel.app' || 
        window.location.hostname === 'hp-ai-image-generator.vercel.app') {
      headers['x-vercel-protection-bypass'] = 'bypass-65da4d54b53364a97e9f990337628188';
      headers['x-vercel-set-bypass-cookie'] = 'true';
    }
    
    return headers;
  };
  const [context, setContext] = useState<Context>({
    industry: '',
    contentType: ''
  });
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]); // 複数選択用
  const [selectedApi, setSelectedApi] = useState<string>('auto');
  const [numberOfImages, setNumberOfImages] = useState<number>(1); // 生成枚数
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string>('');
  const [availableApis, setAvailableApis] = useState<string[]>([]);
  const [promptAnalysis, setPromptAnalysis] = useState<PromptAnalysis | null>(null);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [urlContent, setUrlContent] = useState<UrlContent | null>(null);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState<boolean>(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState<DetailedAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  // const [isDetailedAnalysis, setIsDetailedAnalysis] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [imageHistory, setImageHistory] = useState<ImageHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // APIの可用性をチェック
  useEffect(() => {
    fetchAvailableApis();
    upgradeLocalStorage(); // localStorage履歴をアップグレード
  }, []);

  const fetchAvailableApis = async (): Promise<void> => {
    try {
      const response = await fetch('/api/apis/available', {
        method: 'POST',
        headers: getBypassHeaders(),
        body: JSON.stringify({})
      });
      const data: { available: string[] } = await response.json();
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

  const analyzePrompt = async (): Promise<void> => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: getBypassHeaders(),
        body: JSON.stringify({ 
          prompt, 
          context
        })
      });
      const data: AnalysisResponse = await response.json();
      if (data.success) {
        setPromptAnalysis(data.analysis || null);
      }
    } catch (err) {
      logger.error('Prompt analysis failed:', err);
    }
  };

  // URLからコンテンツを解析
  const analyzeUrl = async (detailed: boolean = false): Promise<void> => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setIsAnalyzingUrl(true);
    // setIsDetailedAnalysis(detailed);
    setError('');
    setAnalysisProgress(0);
    setDetailedAnalysis(null);

    try {
      if (detailed) {
        // 詳細解析
        const response = await fetch('/api/analyze-site', {
          method: 'POST',
          headers: getBypassHeaders(),
          body: JSON.stringify({ url, detailed: true })
        });

        const data: AnalysisResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'サイト解析に失敗しました');
        }

        if (data.success) {
          setDetailedAnalysis({
            pages_analyzed: data.pages_analyzed || 0,
            pages_found: data.pages_found || 0,
            industry_confidence: data.industry_confidence || 'low',
            main_themes: data.main_themes || [],
            visual_style: data.visual_style || { tone: '', atmosphere: [] }
          });
          setPrompt(data.suggested_prompt || '');
          setContext({
            industry: data.industry || '',
            contentType: 'hero'
          });
          
          // テーマやスタイル情報を反映
          if (data.visual_style) {
            setPromptAnalysis(prev => ({
              ...prev,
              style_suggestions: data.visual_style?.atmosphere || [],
              color_palette: data.visual_style?.color_hints || [],
              themes: data.main_themes || []
            }));
          }
          
        }
        setIsAnalyzingUrl(false);
        
      } else {
        // 単純解析（新しい自動推測機能付き）
        const response = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: getBypassHeaders(),
          body: JSON.stringify({ url })
        });

        const data: AnalysisResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'URL解析に失敗しました');
        }

        if (data.success) {
          setUrlContent(data.content || null);
          setPrompt(data.suggested_prompt || '');
          
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
              style_suggestions: prev?.style_suggestions || [],
              color_palette: prev?.color_palette || [],
              themes: prev?.themes || [],
              industry_confidence: data.analysis?.industry_confidence,
              detected_themes: data.analysis?.detected_themes || [],
              analysis_method: data.analysis?.analysis_method
            }));
          }
        }
        setIsAnalyzingUrl(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'URL解析に失敗しました';
      setError(errorMessage);
      setIsAnalyzingUrl(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
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
      
      // タイムアウト付きfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getBypassHeaders(),
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      let data: GenerationResponse;
      
      // レスポンスの処理
      let responseText: string = '';
      try {
        // ネットワークエラーチェック
        if (!response.ok && response.status === 0) {
          throw new Error('ネットワークエラー: サーバーに接続できませんでした');
        }
        
        // まずテキストとして読み取る
        responseText = await response.text();
        
        // 空のレスポンスチェック
        if (!responseText) {
          throw new Error('空のレスポンス: サーバーからデータが返されませんでした');
        }
        
        // JSONとしてパース
        data = JSON.parse(responseText) as GenerationResponse;
      } catch (parseError) {
        // JSONパースエラーの場合 - より詳細な情報を取得
        logger.error('API Response Parse Error:', parseError);
        logger.error('Raw response:', responseText?.substring(0, 200));
        
        // 開発環境でのみ詳細エラーを表示
        if (import.meta.env?.DEV) {
          const errorMsg = parseError instanceof Error ? parseError.message : 'Parse error';
          throw new Error(`JSON Parse Error: ${errorMsg}\nResponse: ${responseText?.substring(0, 100)}...`);
        }
        
        const errorMsg = parseError instanceof Error ? parseError.message : 'Parse error';
        throw new Error(`Server error: ${response.status} - ${errorMsg}`);
      }

      if (!response.ok) {
        // エラーレスポンスの詳細を表示
        logger.error('API Error Details:', data);
        throw new Error(data.details || data.error || 'Generation failed');
      }

      if (data.success) {
        // 単一画像の場合
          if (numberOfImages === 1) {
            const newImage: GeneratedImage = {
              id: Date.now().toString(),
              url: data.image!,
              prompt: data.metadata!.original_prompt,
              provider: data.metadata!.api_used,
              timestamp: Date.now(),
              metadata: {
                original_prompt: data.metadata!.original_prompt,
                enhanced_prompt: data.metadata!.enhanced_prompt,
                api_used: data.metadata!.api_used,
                cost: data.metadata!.cost,
                analysis: data.metadata!.analysis
              }
            };
            setGeneratedImages([...generatedImages, newImage]);
            setTotalCost(totalCost + (data.metadata?.cost || 0));
            
            saveImageToHistory(newImage);
          } else {
            // 複数画像の場合
            const newImages: GeneratedImage[] = data.images!.map((img, index) => ({
              id: (Date.now() + index).toString(),
              url: img.image,
              prompt: img.metadata.original_prompt,
              provider: img.metadata.api_used,
              timestamp: Date.now(),
              metadata: {
                original_prompt: img.metadata.original_prompt,
                enhanced_prompt: img.metadata.enhanced_prompt,
                api_used: img.metadata.api_used,
                cost: img.metadata.cost,
                analysis: img.metadata.analysis
              }
            }));
            setGeneratedImages([...generatedImages, ...newImages]);
            setTotalCost(totalCost + (data.total_cost || 0));
            
            newImages.forEach(img => saveImageToHistory(img));
          }
        
        // プロンプトをクリアしない（追加生成を可能にする）
        // setPrompt('');
        // setAdditionalInstructions(['']);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '画像生成に失敗しました';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // 画像を履歴に保存
  const saveImageToHistory = async (image: GeneratedImage): Promise<void> => {
    try {
      const response = await fetch('/api/images/save', {
        method: 'POST',
        headers: { 
          ...getBypassHeaders(),
          'X-User-Id': 'default' // 今後ユーザー認証を追加可能
        },
        body: JSON.stringify({
          image: image.url,
          metadata: {
            prompt: image.prompt,
            enhancedPrompt: image.metadata?.enhanced_prompt,
            api: image.provider,
            cost: image.metadata?.cost,
            analysis: image.metadata?.analysis
          }
        })
      });
      
      const data: SaveImageResponse = await response.json();
      if (data.success) {
        // デモ画像は保存しない
        if (!data.imageId) {
          return;
        }
        
        // ローカルストレージにも保存（KVが使えない場合のフォールバック）
        if (data.warning) {
          try {
            const localHistory: ImageHistory[] = JSON.parse(localStorage.getItem('imageHistory') || '[]');
            // 開発環境またはローカル環境では画像データも保存
            const shouldSaveImage = window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1' || 
                                   window.location.hostname.includes('local') ||
                                   import.meta.env?.DEV === true ||
                                   import.meta.env?.MODE === 'development';
            
            // デバッグ情報をログに記録（開発環境のみ）
            if (import.meta.env?.DEV) {
              console.log('Debug: shouldSaveImage =', shouldSaveImage, {
                hostname: window.location.hostname,
                isDev: import.meta.env?.DEV,
                mode: import.meta.env?.MODE,
                hasImageSrc: !!image.url
              });
            }
            
            localHistory.unshift({
              id: data.imageId!,
              image: shouldSaveImage ? image.url : null, // 開発環境では画像も保存
              metadata: {
                prompt: image.prompt,
                enhancedPrompt: image.metadata?.enhanced_prompt || undefined,
                api: image.provider,
                cost: image.metadata?.cost || undefined,
                createdAt: new Date().toISOString()
              }
            });
            // 最大保存件数を環境に応じて調整
            const maxItems = shouldSaveImage ? 10 : 20; // 画像ありの場合は少なめ
            if (localHistory.length > maxItems) {
              localHistory.splice(maxItems);
            }
            localStorage.setItem('imageHistory', JSON.stringify(localHistory));
          } catch (storageError) {
            logger.warn('LocalStorage保存エラー:', storageError);
            // 容量エラーの場合は履歴をクリア
            if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
              localStorage.removeItem('imageHistory');
              // より小さなサイズで再試行
              try {
                const minimalHistory: ImageHistory[] = [{
                  id: data.imageId!,
                  metadata: {
                    prompt: image.prompt.substring(0, 100),
                    api: image.provider,
                    createdAt: new Date().toISOString()
                  }
                }];
                localStorage.setItem('imageHistory', JSON.stringify(minimalHistory));
              } catch (retryError) {
                logger.error('履歴保存完全失敗:', retryError);
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('画像保存エラー:', err);
      
      // エラー時もローカルストレージに保存
      try {
        const localHistory: ImageHistory[] = JSON.parse(localStorage.getItem('imageHistory') || '[]');
        const shouldSaveImage = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' || 
                               window.location.hostname.includes('local') ||
                               import.meta.env?.DEV === true ||
                               import.meta.env?.MODE === 'development';
        
        localHistory.unshift({
          id: 'local-' + Date.now(),
          image: shouldSaveImage ? image.url : null, // 開発環境では画像も保存
          metadata: {
            prompt: image.prompt,
            enhancedPrompt: image.metadata?.enhanced_prompt || undefined,
            api: image.provider,
            cost: image.metadata?.cost || undefined,
            createdAt: new Date().toISOString()
          }
        });
        
        const maxItems = shouldSaveImage ? 10 : 20;
        if (localHistory.length > maxItems) {
          localHistory.splice(maxItems);
        }
        localStorage.setItem('imageHistory', JSON.stringify(localHistory));
      } catch (storageError) {
        logger.warn('LocalStorage保存エラー:', storageError);
        if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
          localStorage.removeItem('imageHistory');
        }
      }
    }
  };

  // 履歴を取得
  const loadHistory = async (): Promise<void> => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/images/history', {
        headers: {
          ...getBypassHeaders(),
          'X-User-Id': 'default'
        }
      });
      
      const data: HistoryResponse = await response.json();
      if (data.success) {
        if (data.images.length > 0) {
          setImageHistory(data.images);
        } else if (data.warning) {
          // KVが使えない場合はローカルストレージから取得
          const localHistory: ImageHistory[] = JSON.parse(localStorage.getItem('imageHistory') || '[]');
          setImageHistory(localHistory);
        }
      }
    } catch (err) {
      logger.error('履歴取得エラー:', err);
      // エラー時はローカルストレージから取得
      const localHistory: ImageHistory[] = JSON.parse(localStorage.getItem('imageHistory') || '[]');
      setImageHistory(localHistory);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // localStorage履歴のアップグレード（開発環境でのデバッグ用）
  const upgradeLocalStorage = (): void => {
    try {
      const isDev = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('local') ||
                   import.meta.env?.DEV === true ||
                   import.meta.env?.MODE === 'development';
      
      if (!isDev) return; // 開発環境以外では実行しない
      
      const localHistory: ImageHistory[] = JSON.parse(localStorage.getItem('imageHistory') || '[]');
      const needsUpgrade = localHistory.some(item => !item.image && item.metadata);
      
      if (needsUpgrade) {
        logger.info('LocalStorage履歴のアップグレードが必要ですが、画像データを復元できません。');
        // 注意: 過去の画像データは復元できないため、新しい画像生成時のみ保存される
      }
    } catch (error) {
      logger.error('LocalStorage履歴アップグレードエラー:', error);
    }
  };

  // 履歴から画像をロード
  const loadFromHistory = (historyImage: ImageHistory): void => {
    const loadedImage: GeneratedImage = {
      id: Date.now().toString(),
      url: historyImage.image || '',
      prompt: historyImage.metadata.prompt,
      provider: historyImage.metadata.api,
      timestamp: Date.now(),
      metadata: {
        original_prompt: historyImage.metadata.prompt,
        enhanced_prompt: historyImage.metadata.enhancedPrompt || undefined,
        api_used: historyImage.metadata.api,
        cost: historyImage.metadata.cost || undefined,
        analysis: historyImage.metadata.analysis
      }
    };
    setGeneratedImages([...generatedImages, loadedImage]);
    setTotalCost(totalCost + (loadedImage.metadata?.cost || 0));
    setShowHistory(false);
  };

  // 追加の指示文を追加
  const addInstruction = (preset: string = ''): void => {
    if (preset) {
      setAdditionalInstructions([...additionalInstructions, preset]);
    } else {
      setAdditionalInstructions([...additionalInstructions, '']);
    }
  };

  // 指示文を更新
  const updateInstruction = (index: number, value: string): void => {
    const updated = [...additionalInstructions];
    updated[index] = value;
    setAdditionalInstructions(updated);
  };

  // 指示文を削除
  const removeInstruction = (index: number): void => {
    const updated = additionalInstructions.filter((_, i) => i !== index);
    setAdditionalInstructions(updated.length > 0 ? updated : ['']);
  };

  const handleEdit = (_image: GeneratedImage): void => {
    // 編集機能は未実装
  };

  const handleDownload = (imageSrc: string, filename?: string): void => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = filename || 'generated-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const industries: Industry[] = [
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

  const contentTypes: ContentType[] = [
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-300/20 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-300/20 rounded-full filter blur-3xl animate-float animation-delay-200" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-300/10 rounded-full filter blur-3xl animate-pulse-slow" />
      </div>
      <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 shadow-glow animate-float">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-4xl sm:text-5xl font-bold gradient-text animate-slide-down text-center sm:text-left">
                  AI画像生成システム
                </h1>
                <p className="text-gray-600 text-base sm:text-lg mt-2 animate-slide-up animation-delay-200 text-center sm:text-left">
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
                className="px-5 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <History className="w-4 h-4" />
                生成履歴
              </button>
            </div>
          </div>


          {/* メインフォーム */}
          <div className="card-modern p-8 mb-8 animate-fade-in animation-delay-400">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* 業界選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  業界
                </label>
                <select
                  value={context.industry}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setContext({...context, industry: e.target.value})}
                  className="input-modern"
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
                <div className="space-y-2 max-h-64 overflow-y-auto glass-effect rounded-xl p-4">
                  {contentTypes.slice(1).map(type => (
                    <label key={type.value} className="flex items-start cursor-pointer hover:bg-primary-50/50 p-3 rounded-xl transition-all duration-200 hover:shadow-md">
                      <input
                        type="checkbox"
                        checked={selectedContentTypes.includes(type.value)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
                        <span key={type} className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 font-medium shadow-md">
                          {contentType?.label}
                          <button
                            onClick={() => setSelectedContentTypes(selectedContentTypes.filter(t => t !== type))}
                            className="ml-2 text-primary-600 hover:text-primary-900 transition-colors duration-200"
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
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                <button
                  onClick={() => setInputMode('url')}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    inputMode === 'url' 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  ホームページURLから生成
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    inputMode === 'text' 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  テキストで指定
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
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                      placeholder="https://example.jp"
                      className="flex-1 input-modern"
                    />
                    <button
                      onClick={() => analyzeUrl(true)}
                      disabled={isAnalyzingUrl || !url.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <div className="mt-2 p-4 glass-effect rounded-xl text-sm animate-slide-down">
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
                    <div className="mt-3 p-5 gradient-bg rounded-xl border border-primary-200/50 animate-slide-up">
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
                                <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 rounded-full text-xs font-medium shadow-sm">
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
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                  placeholder="生成したい画像のメインとなる指示を入力してください..."
                  className="input-modern resize-none"
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
                    onClick={() => addInstruction()}
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
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    高品質
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('明るく清潔感のある雰囲気')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    明るい雰囲気
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('プロフェッショナルな印象')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    プロフェッショナル
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('信頼感のあるデザイン')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    信頼感
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('モダンでスタイリッシュ')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    モダン
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('温かみのある雰囲気')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    温かみ
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('ミニマリストデザイン')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    ミニマル
                  </button>
                  <button
                    type="button"
                    onClick={() => addInstruction('日本的な美意識')}
                    className="px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    和風
                  </button>
                </div>
                
                {additionalInstructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={instruction}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => updateInstruction(index, e.target.value)}
                      placeholder={`追加の指示 ${index + 1}（例：明るい雰囲気で、プロフェッショナルな印象）`}
                      className="flex-1 input-modern"
                    />
                    {additionalInstructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-300 hover:shadow-md"
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
              <div className="mb-6 p-6 gradient-bg rounded-xl border border-primary-200/50 animate-fade-in">
                <h3 className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  プロンプト解析
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">推奨スタイル:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {promptAnalysis.style_suggestions?.map((style, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-white to-primary-50 rounded-full text-primary-600 font-medium shadow-sm">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">カラーパレット:</span>
                    <div className="flex gap-2 mt-1">
                      {promptAnalysis.color_palette?.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded border border-gray-300 shadow-sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API選択
                </label>
                <select
                  value={selectedApi}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedApi(e.target.value)}
                  className="input-modern"
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
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setNumberOfImages(parseInt(e.target.value))}
                  className="input-modern"
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
                  className="w-full btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
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
              <div className="mt-4 p-5 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-200 rounded-xl shadow-lg animate-shake">
                <h3 className="text-red-800 font-semibold mb-2">エラーが発生しました</h3>
                <p className="text-red-700">{error}</p>
                {error.includes('クレジット') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm">
                      <strong>解決方法:</strong>
                    </p>
                    <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                      <li><a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>にアクセス</li>
                      <li>Gemini APIキーを確認またはクレジットを追加</li>
                      <li>Vercel環境変数にGEMINI_API_KEYを設定</li>
                      <li>プロジェクトを再デプロイして反映</li>
                    </ol>
                    <p className="mt-2 text-xs text-yellow-600">
                      Gemini 2.5 Flash Imageは1画像あたり$0.039のコストです
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
            <div className="card-modern p-6 mb-8 flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent-600" />
                <span className="font-semibold">総コスト:</span>
              </div>
              <span className="text-2xl font-bold text-accent-600">
                ${totalCost.toFixed(4)}
              </span>
            </div>
          )}

          {/* 生成された画像 */}
          {generatedImages.length > 0 && (
            <div className="glass-effect rounded-2xl p-8 animate-fade-in animation-delay-400">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card-modern max-w-6xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col animate-scale-in mx-4 sm:mx-0">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <History className="w-6 h-6" />
                生成履歴
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:rotate-90"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imageHistory.map((item) => (
                    <div key={item.id} className="glass-effect rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105">
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
                            className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg text-sm font-medium hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
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