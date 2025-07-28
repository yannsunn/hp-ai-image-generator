import React from 'react';
import { X } from 'lucide-react';

const ImageEditingPanel = ({ image, onClose, onSave }) => {
  // 簡易版の編集パネル（将来的に実装予定）
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">画像編集</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center">
            <img
              src={image.src}
              alt={image.prompt}
              className="max-w-full max-h-96 mx-auto mb-4"
            />
            <p className="text-gray-600 mb-4">
              画像編集機能は現在開発中です。
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditingPanel;