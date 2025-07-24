import React, { useState, useEffect } from 'react';
import { Upload, Wand2, Loader2, Download, Edit3, DollarSign, Palette, Sparkles, Key, X } from 'lucide-react';
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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('openai_api_key') || '',
    stability: localStorage.getItem('stability_api_key') || '',
    replicate: localStorage.getItem('replicate_api_token') || ''
  });

  // APIの可用性をチェック
  useEffect(() => {
    // APIキーが設定されているかチェック
    const hasApiKeys = apiKeys.openai || apiKeys.stability || apiKeys.replicate;
    if (!hasApiKeys) {
      setShowApiKeyModal(true);
    }
    fetchAvailableApis();
  }, []);

  const fetchAvailableApis = async () => {
    try {
      const response = await fetch('/api/apis/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_keys: apiKeys })
      });
      const data = await response.json();
      setAvailableApis(data.available || []);
    } catch (err) {
      console.error('Failed to fetch available APIs:', err);
    }
  };

  // APIキーを保存
  const saveApiKeys = () => {
    localStorage.setItem('openai_api_key', apiKeys.openai);
    localStorage.setItem('stability_api_key', apiKeys.stability);
    localStorage.setItem('replicate_api_token', apiKeys.replicate);
    setShowApiKeyModal(false);
    fetchAvailableApis(); // APIキー保存後に再チェック
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

  const analyzePrompt = async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          context,
          api_keys: apiKeys 
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
  const analyzeUrl = async () => {
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }

    setIsAnalyzingUrl(true);
    setError('');

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url,
          api_keys: apiKeys 
        })
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
        
        // スタイル提案も反映
        if (data.style_suggestions) {
          setPromptAnalysis(prev => ({
            ...prev,
            style_suggestions: data.style_suggestions.style_keywords || [],
            color_palette: data.style_suggestions.color_palette || [],
            composition: data.style_suggestions.composition || {}
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'URL解析に失敗しました');
    } finally {
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

    // すべての指示文を結合
    const allInstructions = [prompt];
    additionalInstructions.forEach(instruction => {
      if (instruction.trim()) {
        allInstructions.push(instruction.trim());
      }
    });
    const combinedPrompt = allInstructions.join('. ');

    try {
      // 複数枚生成の場合はバッチAPIを使用
      const endpoint = numberOfImages > 1 ? '/api/generate/batch' : '/api/generate';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: combinedPrompt,
          api: selectedApi,
          count: numberOfImages,
          context: {
            ...context,
            source_url: inputMode === 'url' ? url : undefined,
            locale: 'ja-JP', // 日本向け設定
            style_preferences: {
              ethnicity: 'japanese',
              cultural_context: 'japan',
              text_language: 'japanese'
            }
          },
          options: {},
          api_keys: apiKeys
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
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
        }
        
        setPrompt('');
        setAdditionalInstructions(['']);
      }
    } catch (err) {
      setError(err.message || '画像生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
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
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-10 h-10 text-purple-600" />
              AI画像生成システム
            </h1>
            <p className="text-gray-600">ホームページ制作に最適な画像を生成・編集</p>
          </div>

          {/* APIキー設定案内 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">🔑 APIキーの設定</h3>
                <p className="text-sm text-yellow-700 mb-2">
                  画像生成には以下のAPIキーが必要です：
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>OpenAI</strong> - 高品質な画像生成</li>
                  <li>• <strong>Stability AI</strong> - アーティスティックな画像</li>
                  <li>• <strong>Replicate</strong> - リアルな人物画像</li>
                </ul>
              </div>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                APIキーを設定
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
                        '解析'
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
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  複数枚生成してベストを選べます
                </p>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
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

      {/* APIキー入力モーダル */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Key className="w-6 h-6" />
                  APIキー設定
                </h2>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); saveApiKeys(); }}>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      各APIキーは安全にブラウザのローカルストレージに保存されます。
                      サーバーには送信されません。
                    </p>
                  </div>

                  {/* Hidden username field for accessibility */}
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    style={{ display: 'none' }}
                    value=""
                    onChange={() => {}}
                  />

                  {/* OpenAI API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key (DALL-E 3)
                    </label>
                    <input
                      type="password"
                      name="openai-key"
                      value={apiKeys.openai}
                      onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      取得先: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://platform.openai.com/api-keys</a>
                    </p>
                  </div>

                  {/* Stability AI API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stability AI API Key (Stable Diffusion)
                    </label>
                    <input
                      type="password"
                      name="stability-key"
                      value={apiKeys.stability}
                      onChange={(e) => setApiKeys({...apiKeys, stability: e.target.value})}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      取得先: <a href="https://platform.stability.ai/account/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://platform.stability.ai/account/keys</a>
                    </p>
                  </div>

                  {/* Replicate API Token */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Replicate API Token
                    </label>
                    <input
                      type="password"
                      name="replicate-token"
                      value={apiKeys.replicate}
                      onChange={(e) => setApiKeys({...apiKeys, replicate: e.target.value})}
                      placeholder="r8_..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      取得先: <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://replicate.com/account/api-tokens</a>
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyModal(false)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationForm;