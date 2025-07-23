import React, { useState, useEffect } from 'react';
import { Upload, Wand2, Loader2, Download, Edit3, DollarSign, Palette, Sparkles } from 'lucide-react';
import ImageEditingPanel from './ImageEditingPanel';

const ImageGenerationForm = () => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState({
    industry: '',
    contentType: ''
  });
  const [selectedApi, setSelectedApi] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState('');
  const [availableApis, setAvailableApis] = useState([]);
  const [promptAnalysis, setPromptAnalysis] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [totalCost, setTotalCost] = useState(0);

  // APIの可用性をチェック
  useEffect(() => {
    fetchAvailableApis();
  }, []);

  const fetchAvailableApis = async () => {
    try {
      const response = await fetch('/api/apis/available');
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

  const analyzePrompt = async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });
      const data = await response.json();
      if (data.success) {
        setPromptAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Prompt analysis failed:', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          api: selectedApi,
          context,
          options: {}
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.success) {
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
        setPrompt('');
      }
    } catch (err) {
      setError(err.message || '画像生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
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

            {/* プロンプト入力 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                画像の説明
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="生成したい画像の詳細な説明を入力してください..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
              />
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

            {/* API選択と生成ボタン */}
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={selectedApi}
                onChange={(e) => setSelectedApi(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="auto">自動選択</option>
                {availableApis.map(api => (
                  <option key={api} value={api}>{api.toUpperCase()}</option>
                ))}
              </select>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    画像を生成
                  </>
                )}
              </button>
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
    </div>
  );
};

export default ImageGenerationForm;