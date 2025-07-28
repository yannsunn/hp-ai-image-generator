import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Wand2, Loader2, Download, Edit3, DollarSign, Palette, Sparkles, X, Save, History, Zap, Target, TrendingUp, Award, Cpu, Gauge } from 'lucide-react';
import ImageEditingPanel from './ImageEditingPanel';

const ImageGenerationForm = () => {
  const [prompt, setPrompt] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState(['']); // 追加の指示文
  const [url, setUrl] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'url'
  const [context, setContext] = useState({
    industry: '',
    contentType: ''
  });
  const [selectedApi, setSelectedApi] = useState('auto');
  const [numberOfImages, setNumberOfImages] = useState(1); // 生成枚数
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');
  const [availableApis, setAvailableApis] = useState([]);
  const [promptAnalysis, setPromptAnalysis] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [totalCost, setTotalCost] = useState(0);
  const [urlContent, setUrlContent] = useState(null);
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [detailedAnalysis, setDetailedAnalysis] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isDetailedAnalysis, setIsDetailedAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [imageHistory, setImageHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [ultraMode, setUltraMode] = useState(false);
  const [qualityPrediction, setQualityPrediction] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [realTimeOptimization, setRealTimeOptimization] = useState(true);

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
      console.error('Failed to fetch available APIs:', err);
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
      console.error('Prompt analysis failed:', err);
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
          
          // 進捗ログを表示
          if (data.progress_log) {
            console.log('解析進捗:', data.progress_log);
          }
        }
        setIsAnalyzingUrl(false);
        
      } else {
        // 簡易解析（既存の処理）
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
          setContext({
            industry: data.industry || '',
            contentType: data.content_type || ''
          });
          
          if (data.style_suggestions) {
            setPromptAnalysis(prev => ({
              ...prev,
              style_suggestions: data.style_suggestions.style_keywords || [],
              color_palette: data.style_suggestions.color_palette || [],
              composition: data.style_suggestions.composition || {}
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

  // ULTRA品質予測システム
  const predictQuality = useCallback((currentPrompt, currentContext, currentApi) => {
    if (!realTimeOptimization) return;
    
    // 品質予測アルゴリズム
    let qualityScore = 0.5;
    
    // プロンプト長さ評価
    if (currentPrompt.length >= 50 && currentPrompt.length <= 300) qualityScore += 0.2;
    
    // 業界・コンテンツタイプ指定評価
    if (currentContext.industry) qualityScore += 0.15;
    if (currentContext.contentType) qualityScore += 0.15;
    
    // API適合性評価
    const apiScores = {
      'openai': { 'hero': 0.9, 'team': 0.9, 'about': 0.8 },
      'replicate': { 'service': 0.9, 'product': 0.9 },
      'stability': { 'testimonial': 0.9 }
    };
    
    if (apiScores[currentApi]?.[currentContext.contentType]) {
      qualityScore += 0.1;
    }
    
    const prediction = {
      score: Math.min(1.0, qualityScore),
      level: qualityScore >= 0.8 ? 'EXCELLENT' : qualityScore >= 0.6 ? 'GOOD' : 'ACCEPTABLE',
      recommendations: []
    };
    
    if (qualityScore < 0.6) {
      prediction.recommendations.push('プロンプトをより詳細にしてください');
    }
    if (!currentContext.industry) {
      prediction.recommendations.push('業界を選択すると品質が向上します');
    }
    if (!currentContext.contentType) {
      prediction.recommendations.push('コンテンツタイプを選択してください');
    }
    
    setQualityPrediction(prediction);
  }, [realTimeOptimization]);
  
  // リアルタイム品質予測
  useEffect(() => {
    const timer = setTimeout(() => {
      if (prompt.trim() && realTimeOptimization) {
        predictQuality(prompt, context, selectedApi);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [prompt, context, selectedApi, predictQuality]);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('メインの指示文を入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');

    // すべての指示文を結合
    const allInstructions = [prompt];
    additionalInstructions.forEach(instruction => {
      if (instruction.trim()) {
        allInstructions.push(instruction.trim());
      }
    });
    const combinedPrompt = allInstructions.join('. ');

    try {
      // ULTRAモードの判定
      const useUltraMode = ultraMode || qualityPrediction?.level === 'EXCELLENT';
      
      // エンドポイント選択
      let endpoint;
      if (useUltraMode) {
        endpoint = '/api/ultra-generate';
      } else {
        endpoint = numberOfImages > 1 ? '/api/generate/batch' : '/api/generate';
      }
      
      console.log(`🚀 Using ${useUltraMode ? 'ULTRA' : 'STANDARD'} generation mode`);
      
      const requestPayload = {
        prompt: combinedPrompt,
        api: selectedApi,
        count: numberOfImages,
        context: {
          industry: context.industry,
          contentType: context.contentType,
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
      
      console.log('Sending request with context:', requestPayload.context);
      
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
        console.error('API Response Parse Error:', parseError);
        
        // body stream already read エラーの場合
        if (parseError.message.includes('body stream already read')) {
          throw new Error('レスポンス処理エラー。再度お試しください。');
        }
        
        throw new Error(`Server error: ${response.status} - ${parseError.message}`);
      }

      if (!response.ok) {
        // エラーレスポンスの詳細を表示
        console.error('API Error Details:', data);
        throw new Error(data.details || data.error || 'Generation failed');
      }

      if (data.success) {
        
        // パフォーマンスメトリクスの更新
        if (data.performance_stats) {
          setPerformanceMetrics(data.performance_stats);
        }
        
        // ULTRAモードの結果処理
        if (data.ultra_optimized) {
          const newImages = data.images.map((img, index) => ({
            id: Date.now() + index,
            src: img.image,
            prompt: img.metadata.original_prompt,
            enhancedPrompt: img.metadata.enhanced_prompt || img.metadata.original_prompt,
            api: img.metadata.api_used,
            cost: img.metadata.cost,
            analysis: img.metadata.analysis,
            ultraOptimized: true,
            generationTime: img.metadata.generation_time
          }));
          setGeneratedImages([...generatedImages, ...newImages]);
          setTotalCost(totalCost + newImages.reduce((acc, img) => acc + img.cost, 0));
          
          newImages.forEach(img => saveImageToHistory(img));
        } else {
          // 既存の処理ロジック
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
        if (!data.imageId || data.imageId.startsWith('demo-')) {
          console.warn('デモ画像は保存されません');
          return;
        }
        console.log('画像が保存されました:', data.imageId);
        
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
            console.warn('LocalStorage保存エラー:', storageError);
            // 容量エラーの場合は履歴をクリア
            if (storageError.name === 'QuotaExceededError') {
              localStorage.removeItem('imageHistory');
            }
          }
        }
      }
    } catch (err) {
      console.error('画像保存エラー:', err);
      
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
        console.warn('LocalStorage保存エラー:', storageError);
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
      console.error('履歴取得エラー:', err);
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
  const addInstruction = () => {
    setAdditionalInstructions([...additionalInstructions, '']);
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
    setEditingImage(image);
  };

  const handleEditComplete = (editedImage) => {
    setGeneratedImages(generatedImages.map(img => 
      img.id === editedImage.id ? editedImage : img
    ));
    setEditingImage(null);
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
    { value: 'technology', label: 'テクノロジー' },
    { value: 'healthcare', label: 'ヘルスケア' },
    { value: 'education', label: '教育' },
    { value: 'restaurant', label: '飲食' },
    { value: 'fashion', label: 'ファッション' },
    { value: 'finance', label: '金融' }
  ];

  const contentTypes = [
    { value: '', label: 'コンテンツタイプを選択' },
    { value: 'hero', label: 'ヒーローイメージ' },
    { value: 'about', label: '会社紹介' },
    { value: 'service', label: 'サービス紹介' },
    { value: 'product', label: '商品紹介' },
    { value: 'team', label: 'チーム紹介' },
    { value: 'testimonial', label: 'お客様の声' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* ULTRAヘッダー */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className={`p-3 rounded-full transition-all duration-300 ${
                ultraMode ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg' : 'bg-purple-100'
              }`}>
                {ultraMode ? (
                  <Zap className="w-10 h-10 text-white" />
                ) : (
                  <Sparkles className="w-10 h-10 text-purple-600" />
                )}
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                  {ultraMode ? 'ULTRA AI' : 'AI'}画像生成システム
                  {ultraMode && <Award className="w-8 h-8 text-yellow-500" />}
                </h1>
                <p className="text-gray-600">
                  {ultraMode ? '最先端のULTRA最適化エンジンで最高品質の画像を生成' : 'ホームページ制作に最適な画像を生成・編集'}
                </p>
              </div>
            </div>
            
            {/* ULTRAモードコントロール */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setUltraMode(!ultraMode)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                  ultraMode 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Zap className="w-5 h-5" />
                ULTRAモード
              </button>
              
              <button
                onClick={() => setRealTimeOptimization(!realTimeOptimization)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  realTimeOptimization 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                リアルタイム最適化
              </button>
              
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
            
            {/* リアルタイムパフォーマンスメトリクス */}
            {performanceMetrics && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">平均生成時間:</span>
                    <span className="text-blue-600">{Math.round(performanceMetrics.average_execution_time / 1000)}s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="font-medium">パフォーマンス:</span>
                    <span className="text-green-600">{performanceMetrics.average_performance_score.toFixed(2)} images/s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-600" />
                    <span className="font-medium">最適化レベル:</span>
                    <span className="text-purple-600">{performanceMetrics.optimization_level}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* 品質予測表示 */}
            {qualityPrediction && realTimeOptimization && (
              <div className={`rounded-lg p-4 mb-4 ${
                qualityPrediction.level === 'EXCELLENT' ? 'bg-green-50 border border-green-200' :
                qualityPrediction.level === 'GOOD' ? 'bg-blue-50 border border-blue-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${
                    qualityPrediction.level === 'EXCELLENT' ? 'bg-green-500' :
                    qualityPrediction.level === 'GOOD' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="font-semibold">予測品質: {qualityPrediction.level}</span>
                  <span className="text-sm bg-white px-2 py-1 rounded">
                    {Math.round(qualityPrediction.score * 100)}%
                  </span>
                </div>
                {qualityPrediction.recommendations.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">推奨事項:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {qualityPrediction.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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

              {/* コンテンツタイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コンテンツタイプ
                </label>
                <select
                  value={context.contentType}
                  onChange={(e) => setContext({...context, contentType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {contentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
                      onClick={analyzeUrl}
                      disabled={isAnalyzingUrl || !url.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAnalyzingUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          解析中
                        </>
                      ) : (
                        '簡易解析'
                      )}
                    </button>
                    <button
                      onClick={() => analyzeUrl(true)}
                      disabled={isAnalyzingUrl || !url.trim()}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isAnalyzingUrl && isDetailedAnalysis ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {analysisProgress}%
                        </>
                      ) : (
                        '詳細解析'
                      )}
                    </button>
                  </div>
                  {urlContent && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-medium text-blue-900">サイト解析完了</p>
                      <p className="text-blue-700">{urlContent.title}</p>
                      {context.industry && (
                        <p className="text-blue-600 mt-1">
                          業界: {context.industry} / タイプ: {context.contentType}
                        </p>
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
                    追加の指示文
                  </label>
                  <button
                    type="button"
                    onClick={addInstruction}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    + 指示を追加
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
                  className={`w-full px-8 py-3 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 ${
                    ultraMode 
                      ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 shadow-lg transform hover:scale-105' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {ultraMode && '🚀 ULTRA '}
                      {numberOfImages > 1 ? `${numberOfImages}枚生成中...` : '生成中...'}
                    </>
                  ) : (
                    <>
                      {ultraMode ? <Zap className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                      {ultraMode && 'ULTRA '}
                      {numberOfImages > 1 ? `${numberOfImages}枚生成` : '画像を生成'}
                      {ultraMode && ' ⚡'}
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
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">生成された画像</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedImages.map((image) => (
                  <div key={image.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200">
                    <img
                      src={image.src}
                      alt={image.prompt}
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {image.prompt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>API: {image.api}</span>
                        <span>${image.cost.toFixed(4)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(image)}
                          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          編集
                        </button>
                        <button
                          onClick={() => handleDownload(image.src, `image-${image.id}.png`)}
                          className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 画像編集パネル */}
      {editingImage && (
        <ImageEditingPanel
          image={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleEditComplete}
        />
      )}

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