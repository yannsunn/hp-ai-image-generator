import React from 'react';
import ImageGenerationForm from './components/ImageGenerationForm';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* シンプルなヘッダー */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            AI画像生成
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ImageGenerationForm />
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 text-center">
            Powered by Gemini 2.5 Flash Image
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
