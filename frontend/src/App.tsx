import React from 'react';
import ImageGenerationForm from './components/ImageGenerationForm';
import { Sparkles } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI画像生成システム
              </h1>
              <p className="text-sm text-gray-500">ホームページ用の高品質な画像を自動生成</p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ImageGenerationForm />
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Powered by Gemini 2.5 Flash Image
            </p>
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} AI Image Generation System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
