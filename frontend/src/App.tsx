import React from 'react';
import ImageGenerationForm from './components/ImageGenerationForm';
import { Sparkles, Zap, Image as ImageIcon, Palette } from 'lucide-react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI画像生成システム
              </h1>
              <p className="text-sm text-gray-500">ホームページ用の高品質な画像を自動生成</p>
            </div>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Powered by Gemini 2.5 Flash Image
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            URLを入力するだけで<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              プロ品質の画像を自動生成
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            ホームページの各セクションに最適な画像を、AIが自動分析・生成。<br />
            デザイナー不要で、高級感のあるビジュアルを数分で完成。
          </p>

          {/* 特徴カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">超高速生成</h3>
              <p className="text-gray-600 text-sm">URL分析から画像生成まで、わずか数分で完了。複数箇所を一括生成可能。</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI自動最適化</h3>
              <p className="text-gray-600 text-sm">業界・デザイン・既存画像を分析し、最適なスタイルとカラーを自動選択。</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">高級感設定</h3>
              <p className="text-gray-600 text-sm">Standard/Premium/Luxury の3段階で品質調整。落ち着いた色調も選択可能。</p>
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ImageGenerationForm />
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                AI画像生成システム
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Powered by Gemini 2.5 Flash Image API
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
