import React, { useState } from 'react';
import { Loader2, Sparkles, Download } from 'lucide-react';

const ImageGenerationForm: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [analysisInfo, setAnalysisInfo] = useState<string>('');

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
    setAnalysisInfo('');

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
        throw new Error(data.error || `URL解析に失敗しました (${response.status})`);
      }

      if (data.success) {
        setPrompt(data.suggested_prompt || '');

        // 分析情報を表示
        const info = [];
        if (data.industry) info.push(`業界: ${data.industry}`);
        if (data.content_type) info.push(`タイプ: ${data.content_type}`);
        if (data.from_cache) info.push('(キャッシュから取得)');

        setAnalysisInfo(info.join(' / '));
      }
    } catch (err) {
      console.error('Analysis Error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 画像を生成
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
        headers: getBypassHeaders(),
        body: JSON.stringify({
          prompt,
          api: 'gemini'
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
        throw new Error(data.error || `画像生成に失敗しました (${response.status})`);
      }

      if (data.success && data.image) {
        setGeneratedImage(data.image);
      }
    } catch (err) {
      console.error('Generation Error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 画像をダウンロード
  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* URL入力セクション */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-900 mb-2">
              ウェブサイトURL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                disabled={isAnalyzing}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !url.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
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
            <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-md">
              {analysisInfo}
            </div>
          )}
        </div>
      </div>

      {/* プロンプト編集セクション */}
      {prompt && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-900 mb-2">
                プロンプト
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                placeholder="画像生成のプロンプトを入力..."
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-sm"
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
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 生成された画像 */}
      {generatedImage && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">生成結果</h3>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                ダウンロード
              </button>
            </div>
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 使い方ガイド */}
      {!prompt && !generatedImage && !isAnalyzing && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">使い方</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-600 font-medium">1.</span>
              <span>ウェブサイトのURLを入力して「分析」ボタンをクリック</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-medium">2.</span>
              <span>自動生成されたプロンプトを確認・編集</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-medium">3.</span>
              <span>「画像を生成」ボタンをクリックして完了</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationForm;
