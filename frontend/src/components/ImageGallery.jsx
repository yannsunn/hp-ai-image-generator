import React, { useState, useEffect, useRef } from 'react';
import { Download, Maximize2, Info, Calendar, Layers, DollarSign, X } from 'lucide-react';

const ImageGallery = ({ images, onEdit, onDownload }) => {
  const [columns, setColumns] = useState(3);
  const [selectedImage, setSelectedImage] = useState(null);
  const galleryRef = useRef(null);

  // レスポンシブなカラム数を計算
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) setColumns(1);
      else if (width < 1024) setColumns(2);
      else if (width < 1536) setColumns(3);
      else setColumns(4);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // 画像をカラムに分配（メイソンリーレイアウト）
  const distributeImages = () => {
    const columnHeights = new Array(columns).fill(0);
    const columnImages = Array.from({ length: columns }, () => []);

    images.forEach((image, index) => {
      // 最も短いカラムを見つける
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      
      // 画像の高さを推定（アスペクト比に基づく）
      const estimatedHeight = image.metadata?.height || (Math.random() * 200 + 300);
      
      columnImages[shortestColumn].push({ ...image, index });
      columnHeights[shortestColumn] += estimatedHeight;
    });

    return columnImages;
  };

  const columnImages = distributeImages();

  // 画像の詳細モーダル
  const ImageModal = ({ image, onClose }) => {
    if (!image) return null;

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="relative max-w-7xl w-full max-h-[90vh] flex" onClick={(e) => e.stopPropagation()}>
          {/* 画像部分 */}
          <div className="flex-1 flex items-center justify-center bg-black">
            <img
              src={image.src}
              alt={image.prompt}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
          
          {/* メタデータパネル */}
          <div className="w-96 bg-white p-6 overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <h3 className="text-xl font-semibold mb-4">画像詳細</h3>
            
            <div className="space-y-4">
              {/* プロンプト */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">プロンプト</h4>
                <p className="text-gray-800">{image.prompt}</p>
              </div>

              {/* 強化されたプロンプト */}
              {image.enhancedPrompt && image.enhancedPrompt !== image.prompt && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">強化プロンプト</h4>
                  <p className="text-gray-600 text-sm">{image.enhancedPrompt}</p>
                </div>
              )}

              {/* メタデータ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs">API</span>
                  </div>
                  <p className="font-medium">{image.api?.toUpperCase()}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">コスト</span>
                  </div>
                  <p className="font-medium">${image.cost?.toFixed(4) || '0.0000'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Info className="w-4 h-4" />
                    <span className="text-xs">解像度</span>
                  </div>
                  <p className="font-medium">{image.metadata?.resolution || '1024x1024'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">生成時間</span>
                  </div>
                  <p className="font-medium">
                    {image.metadata?.generation_time 
                      ? `${(image.metadata.generation_time / 1000).toFixed(1)}秒`
                      : '不明'}
                  </p>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => onEdit(image)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  画像を編集
                </button>
                <button
                  onClick={() => onDownload(image.src, `image-${image.id}.png`)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                >
                  ダウンロード
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div ref={galleryRef} className="w-full">
        {/* ギャラリーヘッダー */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">生成された画像</h2>
          <p className="text-gray-600">
            {images.length}枚の画像が生成されました
          </p>
        </div>

        {/* メイソンリーグリッド */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {columnImages.map((column, columnIndex) => (
            <div key={columnIndex} className="flex flex-col gap-4">
              {column.map((image) => (
                <div
                  key={image.id}
                  className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* 画像 */}
                  <div className="relative overflow-hidden">
                    <img
                      src={image.src}
                      alt={image.prompt}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* ホバーオーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-sm line-clamp-2 mb-2">{image.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-80">{image.api?.toUpperCase()}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownload(image.src, `image-${image.id}.png`);
                              }}
                              className="p-1.5 bg-white/20 backdrop-blur rounded hover:bg-white/30 transition-colors"
                              title="ダウンロード"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(image);
                              }}
                              className="p-1.5 bg-white/20 backdrop-blur rounded hover:bg-white/30 transition-colors"
                              title="詳細を見る"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* メタデータ（lovart.ai風） */}
                  <div className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {image.api?.charAt(0).toUpperCase() || 'AI'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">AI Generated</p>
                          <p className="text-xs text-gray-500">${image.cost?.toFixed(3) || '0.000'}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(image);
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 画像詳細モーダル */}
      <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default ImageGallery;