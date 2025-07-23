import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Edit3, 
  Wand2, 
  Palette, 
  Settings, 
  Download, 
  RotateCcw, 
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Brush,
  Layers
} from 'lucide-react';

const ImageEditingPanel = ({ 
  originalImage, 
  onEditComplete, 
  onClose 
}) => {
  const [editedImage, setEditedImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [editType, setEditType] = useState('modify');
  const [strength, setStrength] = useState([0.8]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [availableEditors, setAvailableEditors] = useState([]);
  const [editPresets, setEditPresets] = useState({});
  const [cost, setCost] = useState(0);
  const [editTime, setEditTime] = useState(0);

  // コンポーネントマウント時に編集プリセットと利用可能エディターを取得
  useEffect(() => {
    fetchEditPresets();
    fetchAvailableEditors();
  }, []);

  const fetchEditPresets = async () => {
    try {
      const response = await fetch('/api/edit/presets');
      const data = await response.json();
      setEditPresets(data);
    } catch (error) {
      console.error('Failed to fetch edit presets:', error);
    }
  };

  const fetchAvailableEditors = async () => {
    try {
      const response = await fetch('/api/edit/editors/available');
      const data = await response.json();
      setAvailableEditors(data.available_editors || []);
    } catch (error) {
      console.error('Failed to fetch available editors:', error);
    }
  };

  const handleEdit = async () => {
    if (!editInstruction.trim()) {
      alert('編集指示を入力してください');
      return;
    }

    setIsEditing(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/edit/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: originalImage,
          edit_instruction: editInstruction,
          edit_type: editType,
          strength: strength[0],
          preserve_composition: true
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const newEditedImage = data.result.edited_image;
        setEditedImage(newEditedImage);
        setCost(data.result.cost);
        setEditTime(data.result.edit_time);
        
        // 編集履歴に追加
        const historyEntry = {
          id: Date.now(),
          instruction: editInstruction,
          image: newEditedImage,
          api_used: data.result.api_used,
          cost: data.result.cost,
          timestamp: new Date().toLocaleTimeString()
        };
        setEditHistory(prev => [historyEntry, ...prev]);

        if (onEditComplete) {
          onEditComplete(newEditedImage, data.result);
        }
      } else {
        alert(`編集エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('編集中にエラーが発生しました');
    } finally {
      setIsEditing(false);
      setEditTime((Date.now() - startTime) / 1000);
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setEditInstruction(preset.instruction);
    setEditType(preset.type);
    setStrength([preset.strength]);
  };

  const handleReset = () => {
    setEditedImage(null);
    setEditInstruction('');
    setSelectedPreset(null);
    setStrength([0.8]);
    setCost(0);
    setEditTime(0);
  };

  const downloadImage = (imageData, filename) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = filename;
    link.click();
  };

  const renderPresetCategory = (categoryName, presets) => (
    <div key={categoryName} className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 capitalize">
        {categoryName.replace('_', ' ')}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset, index) => (
          <Button
            key={index}
            variant={selectedPreset?.name === preset.name ? "default" : "outline"}
            size="sm"
            className="h-auto p-2 text-xs"
            onClick={() => handlePresetSelect(preset)}
          >
            <div className="text-center">
              <div className="font-medium">{preset.name}</div>
              {preset.requires_mask && (
                <Badge variant="secondary" className="text-xs mt-1">
                  マスク必要
                </Badge>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-full">
          {/* 左側: 画像表示エリア */}
          <div className="flex-1 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                画像編集
              </h2>
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* 元画像 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">元画像</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <img
                    src={`data:image/png;base64,${originalImage}`}
                    alt="Original"
                    className="w-full h-auto max-h-96 object-contain rounded"
                  />
                </div>
              </div>

              {/* 編集後画像 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">編集後画像</Label>
                  {editedImage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadImage(editedImage, 'edited-image.png')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      ダウンロード
                    </Button>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  {editedImage ? (
                    <img
                      src={`data:image/png;base64,${editedImage}`}
                      alt="Edited"
                      className="w-full h-auto max-h-96 object-contain rounded"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-96 text-gray-400">
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>編集後の画像がここに表示されます</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 編集情報 */}
                {editedImage && (
                  <div className="bg-white p-3 rounded border text-sm">
                    <div className="flex justify-between items-center">
                      <span>コスト: ${cost.toFixed(4)}</span>
                      <span>処理時間: {editTime.toFixed(1)}秒</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側: 編集コントロール */}
          <div className="w-96 border-l bg-white overflow-y-auto">
            <div className="p-6">
              <Tabs defaultValue="custom" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="custom" className="text-xs">
                    <Brush className="w-4 h-4 mr-1" />
                    カスタム
                  </TabsTrigger>
                  <TabsTrigger value="presets" className="text-xs">
                    <Wand2 className="w-4 h-4 mr-1" />
                    プリセット
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">
                    <Layers className="w-4 h-4 mr-1" />
                    履歴
                  </TabsTrigger>
                </TabsList>

                {/* カスタム編集タブ */}
                <TabsContent value="custom" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">編集指示</CardTitle>
                      <CardDescription className="text-xs">
                        自然言語で編集内容を指示してください
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="edit-instruction" className="text-xs">
                          編集内容
                        </Label>
                        <Textarea
                          id="edit-instruction"
                          placeholder="例: 背景を青空に変更して、明るくしてください"
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          className="mt-1 text-sm"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">編集タイプ</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <Button
                            variant={editType === 'modify' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditType('modify')}
                            className="text-xs"
                          >
                            全体修正
                          </Button>
                          <Button
                            variant={editType === 'inpaint' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEditType('inpaint')}
                            className="text-xs"
                          >
                            部分編集
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">編集強度: {strength[0]}</Label>
                        <Slider
                          value={strength}
                          onValueChange={setStrength}
                          max={1}
                          min={0.1}
                          step={0.1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>弱い</span>
                          <span>強い</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleEdit}
                          disabled={isEditing || !editInstruction.trim()}
                          className="flex-1"
                          size="sm"
                        >
                          {isEditing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              編集中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-1" />
                              編集実行
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          size="sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 利用可能エディター */}
                  {availableEditors.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">利用可能エディター</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {availableEditors.map((editor) => (
                            <Badge key={editor} variant="secondary" className="text-xs">
                              {editor}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* プリセットタブ */}
                <TabsContent value="presets" className="space-y-4">
                  <div className="space-y-4">
                    {Object.entries(editPresets).map(([category, presets]) =>
                      renderPresetCategory(category, presets)
                    )}
                  </div>
                </TabsContent>

                {/* 履歴タブ */}
                <TabsContent value="history" className="space-y-2">
                  {editHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Layers className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">編集履歴がありません</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editHistory.map((entry) => (
                        <Card key={entry.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={`data:image/png;base64,${entry.image}`}
                              alt="History"
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {entry.instruction}
                              </p>
                              <div className="flex justify-between items-center mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {entry.api_used}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {entry.timestamp}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-gray-600">
                                  ${entry.cost.toFixed(4)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setEditedImage(entry.image)}
                                >
                                  復元
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditingPanel;

