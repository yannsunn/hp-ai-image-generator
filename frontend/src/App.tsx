import React, { useEffect, useState } from 'react';
import ImageGenerationForm from './components/ImageGenerationForm';

const App: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="App relative min-h-screen overflow-hidden">
      {/* 限界を超えた背景エフェクト */}
      <div className="fixed inset-0 -z-10">
        {/* グラデーションメッシュ背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-pink-900 opacity-90" />
        
        {/* 動的グラデーションオーブ */}
        <div 
          className="absolute w-[800px] h-[800px] rounded-full filter blur-[120px] opacity-70"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.8) 0%, rgba(217,70,239,0.6) 50%, rgba(99,102,241,0.4) 100%)',
            left: `${mousePosition.x * 0.05}px`,
            top: `${mousePosition.y * 0.05}px`,
            transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0005})`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        
        {/* パーティクルフィールド */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${10 + Math.random() * 20}s`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            />
          ))}
        </div>

        {/* サイバーグリッド */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `perspective(1000px) rotateX(60deg) translateY(${scrollY * 0.5}px)`,
            transformOrigin: 'center center',
          }}
        />

        {/* ネオンライトエフェクト */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full filter blur-[200px] opacity-30 animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-[200px] opacity-30 animate-pulse-slow animation-delay-200" />
        
        {/* フローティングシェイプ */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 border-2 border-white/10 rounded-full animate-float animation-delay-400" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 border-2 border-white/10 rounded-lg rotate-45 animate-float animation-delay-200" />
      </div>

      {/* グローバルライティング効果 */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 opacity-50"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139,92,246,0.15) 0%, transparent 25%)`,
        }}
      />

      {/* メインコンテンツ */}
      <div className="relative z-10">
        <ImageGenerationForm />
      </div>

      {/* フローティングアクションインジケーター */}
      <div className="fixed bottom-8 right-8 z-20">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md animate-pulse" />
          <div className="relative bg-black/50 backdrop-blur-xl rounded-full p-4 border border-white/20">
            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          </div>
        </div>
      </div>

      {/* スクロールプログレスバー */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        <div 
          className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 transition-all duration-300"
          style={{ width: `${(scrollY / (document.body.scrollHeight - window.innerHeight)) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default App;