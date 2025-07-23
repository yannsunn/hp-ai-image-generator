"""
画像編集APIクライアント
生成された画像の編集・修正機能を提供
"""

import os
import asyncio
import aiohttp
import requests
import base64
from typing import List, Dict, Any, Optional, Union
from abc import ABC, abstractmethod
from dataclasses import dataclass
from PIL import Image, ImageDraw, ImageFilter
import io
import openai
import numpy as np


@dataclass
class ImageEditRequest:
    """画像編集リクエストのデータクラス"""
    image_data: str  # Base64エンコードされた画像データ
    edit_instruction: str  # 編集指示（自然言語）
    edit_type: str = "modify"  # modify, inpaint, outpaint, style_transfer
    mask_data: Optional[str] = None  # マスク画像（inpaint用）
    strength: float = 0.8  # 編集の強度（0.0-1.0）
    preserve_composition: bool = True  # 構図を保持するか
    api_preference: Optional[List[str]] = None


@dataclass
class ImageEditResult:
    """画像編集結果のデータクラス"""
    edited_image: str  # Base64エンコードされた編集後画像
    original_image: str  # 元画像
    edit_instruction: str  # 適用された編集指示
    api_used: str
    cost: float
    edit_time: float
    metadata: Dict[str, Any]


class BaseImageEditor(ABC):
    """画像編集APIの基底クラス"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.name = self.__class__.__name__
    
    @abstractmethod
    async def edit_image(self, request: ImageEditRequest) -> ImageEditResult:
        """画像を編集する抽象メソッド"""
        pass
    
    @abstractmethod
    def get_edit_cost(self, edit_type: str) -> float:
        """編集1回あたりのコストを取得"""
        pass


class OpenAIImageEditor(BaseImageEditor):
    """OpenAI DALL-E 画像編集クライアント"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = openai.OpenAI(api_key=api_key)
    
    async def edit_image(self, request: ImageEditRequest) -> ImageEditResult:
        """OpenAI DALL-Eで画像を編集"""
        import time
        start_time = time.time()
        
        try:
            # Base64画像をPIL Imageに変換
            image_bytes = base64.b64decode(request.image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # 画像をPNGに変換（DALL-E要件）
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            # 画像をバイトストリームに変換
            img_buffer = io.BytesIO()
            image.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            if request.edit_type == "inpaint" and request.mask_data:
                # インペインティング（部分編集）
                mask_bytes = base64.b64decode(request.mask_data)
                mask_buffer = io.BytesIO(mask_bytes)
                
                response = self.client.images.edit(
                    image=img_buffer,
                    mask=mask_buffer,
                    prompt=request.edit_instruction,
                    n=1,
                    size="1024x1024"
                )
            else:
                # バリエーション生成（全体編集）
                # DALL-E 3では直接的な編集ではなく、新しい画像を生成
                enhanced_prompt = f"Edit this image: {request.edit_instruction}. Maintain the overall composition and style."
                
                response = self.client.images.generate(
                    model="dall-e-3",
                    prompt=enhanced_prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
            
            # 結果画像をダウンロード
            result_url = response.data[0].url
            img_response = requests.get(result_url)
            edited_image_base64 = base64.b64encode(img_response.content).decode('utf-8')
            
            edit_time = time.time() - start_time
            cost = self.get_edit_cost(request.edit_type)
            
            return ImageEditResult(
                edited_image=edited_image_base64,
                original_image=request.image_data,
                edit_instruction=request.edit_instruction,
                api_used="OpenAI DALL-E",
                cost=cost,
                edit_time=edit_time,
                metadata={
                    "model": "dall-e-3",
                    "edit_type": request.edit_type,
                    "strength": request.strength
                }
            )
            
        except Exception as e:
            raise Exception(f"OpenAI image editing error: {str(e)}")
    
    def get_edit_cost(self, edit_type: str) -> float:
        """OpenAI画像編集のコスト"""
        cost_map = {
            "modify": 0.04,
            "inpaint": 0.04,
            "outpaint": 0.04,
            "style_transfer": 0.04
        }
        return cost_map.get(edit_type, 0.04)


class StabilityImageEditor(BaseImageEditor):
    """Stability AI 画像編集クライアント"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.stability.ai"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
    
    async def edit_image(self, request: ImageEditRequest) -> ImageEditResult:
        """Stability AIで画像を編集"""
        import time
        start_time = time.time()
        
        try:
            if request.edit_type == "inpaint":
                return await self._inpaint_image(request, start_time)
            elif request.edit_type == "outpaint":
                return await self._outpaint_image(request, start_time)
            else:
                return await self._modify_image(request, start_time)
                
        except Exception as e:
            raise Exception(f"Stability AI image editing error: {str(e)}")
    
    async def _inpaint_image(self, request: ImageEditRequest, start_time: float) -> ImageEditResult:
        """インペインティング（部分編集）"""
        url = f"{self.base_url}/v2beta/stable-image/edit/inpaint"
        
        # マルチパートフォームデータを準備
        image_bytes = base64.b64decode(request.image_data)
        mask_bytes = base64.b64decode(request.mask_data) if request.mask_data else None
        
        data = {
            'prompt': request.edit_instruction,
            'output_format': 'png',
            'strength': request.strength
        }
        
        files = {
            'image': ('image.png', image_bytes, 'image/png')
        }
        
        if mask_bytes:
            files['mask'] = ('mask.png', mask_bytes, 'image/png')
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, data=data, files=files) as response:
                if response.status == 200:
                    result = await response.json()
                    edited_image_base64 = result.get('image', '')
                    
                    edit_time = time.time() - start_time
                    cost = self.get_edit_cost(request.edit_type)
                    
                    return ImageEditResult(
                        edited_image=edited_image_base64,
                        original_image=request.image_data,
                        edit_instruction=request.edit_instruction,
                        api_used="Stability AI",
                        cost=cost,
                        edit_time=edit_time,
                        metadata={
                            "model": "stable-diffusion",
                            "edit_type": "inpaint",
                            "strength": request.strength
                        }
                    )
                else:
                    error_text = await response.text()
                    raise Exception(f"Stability AI API error: {response.status} - {error_text}")
    
    async def _outpaint_image(self, request: ImageEditRequest, start_time: float) -> ImageEditResult:
        """アウトペインティング（画像拡張）"""
        url = f"{self.base_url}/v2beta/stable-image/edit/outpaint"
        
        image_bytes = base64.b64decode(request.image_data)
        
        data = {
            'prompt': request.edit_instruction,
            'output_format': 'png',
            'creativity': request.strength
        }
        
        files = {
            'image': ('image.png', image_bytes, 'image/png')
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, data=data, files=files) as response:
                if response.status == 200:
                    result = await response.json()
                    edited_image_base64 = result.get('image', '')
                    
                    edit_time = time.time() - start_time
                    cost = self.get_edit_cost(request.edit_type)
                    
                    return ImageEditResult(
                        edited_image=edited_image_base64,
                        original_image=request.image_data,
                        edit_instruction=request.edit_instruction,
                        api_used="Stability AI",
                        cost=cost,
                        edit_time=edit_time,
                        metadata={
                            "model": "stable-diffusion",
                            "edit_type": "outpaint",
                            "creativity": request.strength
                        }
                    )
                else:
                    error_text = await response.text()
                    raise Exception(f"Stability AI API error: {response.status} - {error_text}")
    
    async def _modify_image(self, request: ImageEditRequest, start_time: float) -> ImageEditResult:
        """画像修正（Image-to-Image）"""
        url = f"{self.base_url}/v2beta/stable-image/generate/sd3"
        
        image_bytes = base64.b64decode(request.image_data)
        
        data = {
            'prompt': request.edit_instruction,
            'mode': 'image-to-image',
            'output_format': 'png',
            'strength': request.strength
        }
        
        files = {
            'image': ('image.png', image_bytes, 'image/png')
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, data=data, files=files) as response:
                if response.status == 200:
                    result = await response.json()
                    edited_image_base64 = result.get('image', '')
                    
                    edit_time = time.time() - start_time
                    cost = self.get_edit_cost(request.edit_type)
                    
                    return ImageEditResult(
                        edited_image=edited_image_base64,
                        original_image=request.image_data,
                        edit_instruction=request.edit_instruction,
                        api_used="Stability AI",
                        cost=cost,
                        edit_time=edit_time,
                        metadata={
                            "model": "sd3",
                            "edit_type": "modify",
                            "strength": request.strength
                        }
                    )
                else:
                    error_text = await response.text()
                    raise Exception(f"Stability AI API error: {response.status} - {error_text}")
    
    def get_edit_cost(self, edit_type: str) -> float:
        """Stability AI画像編集のコスト"""
        cost_map = {
            "modify": 0.04,
            "inpaint": 0.04,
            "outpaint": 0.04,
            "style_transfer": 0.04
        }
        return cost_map.get(edit_type, 0.04)


class LocalImageEditor(BaseImageEditor):
    """ローカル画像編集（PIL/OpenCV使用）"""
    
    def __init__(self, api_key: str = "local"):
        super().__init__(api_key)
    
    async def edit_image(self, request: ImageEditRequest) -> ImageEditResult:
        """ローカルで画像を編集"""
        import time
        start_time = time.time()
        
        try:
            # Base64画像をPIL Imageに変換
            image_bytes = base64.b64decode(request.image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # 編集指示に基づいて処理を選択
            edited_image = await self._apply_local_edits(image, request)
            
            # 編集後画像をBase64に変換
            img_buffer = io.BytesIO()
            edited_image.save(img_buffer, format='PNG')
            edited_image_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
            
            edit_time = time.time() - start_time
            
            return ImageEditResult(
                edited_image=edited_image_base64,
                original_image=request.image_data,
                edit_instruction=request.edit_instruction,
                api_used="Local Editor",
                cost=0.0,  # ローカル処理なのでコストなし
                edit_time=edit_time,
                metadata={
                    "editor": "PIL",
                    "edit_type": request.edit_type,
                    "strength": request.strength
                }
            )
            
        except Exception as e:
            raise Exception(f"Local image editing error: {str(e)}")
    
    async def _apply_local_edits(self, image: Image.Image, request: ImageEditRequest) -> Image.Image:
        """ローカル編集の適用"""
        instruction = request.edit_instruction.lower()
        edited_image = image.copy()
        
        # 基本的な画像処理
        if "blur" in instruction or "ぼかし" in instruction:
            edited_image = edited_image.filter(ImageFilter.GaussianBlur(radius=2))
        
        elif "sharpen" in instruction or "シャープ" in instruction:
            edited_image = edited_image.filter(ImageFilter.SHARPEN)
        
        elif "bright" in instruction or "明るく" in instruction:
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(edited_image)
            edited_image = enhancer.enhance(1.3)
        
        elif "dark" in instruction or "暗く" in instruction:
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Brightness(edited_image)
            edited_image = enhancer.enhance(0.7)
        
        elif "contrast" in instruction or "コントラスト" in instruction:
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(edited_image)
            edited_image = enhancer.enhance(1.2)
        
        elif "sepia" in instruction or "セピア" in instruction:
            edited_image = self._apply_sepia_filter(edited_image)
        
        elif "grayscale" in instruction or "グレースケール" in instruction or "白黒" in instruction:
            edited_image = edited_image.convert('L').convert('RGB')
        
        elif "resize" in instruction or "リサイズ" in instruction:
            # サイズ変更（例：半分のサイズ）
            width, height = edited_image.size
            edited_image = edited_image.resize((width//2, height//2), Image.Resampling.LANCZOS)
        
        return edited_image
    
    def _apply_sepia_filter(self, image: Image.Image) -> Image.Image:
        """セピアフィルターを適用"""
        pixels = image.load()
        width, height = image.size
        
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y][:3]
                
                # セピア変換
                tr = int(0.393 * r + 0.769 * g + 0.189 * b)
                tg = int(0.349 * r + 0.686 * g + 0.168 * b)
                tb = int(0.272 * r + 0.534 * g + 0.131 * b)
                
                # 255を超えないように制限
                pixels[x, y] = (min(255, tr), min(255, tg), min(255, tb))
        
        return image
    
    def get_edit_cost(self, edit_type: str) -> float:
        """ローカル編集のコスト（無料）"""
        return 0.0


class ImageEditManager:
    """画像編集APIを統合管理するマネージャークラス"""
    
    def __init__(self):
        self.editors = {}
        self._initialize_editors()
    
    def _initialize_editors(self):
        """環境変数からAPIキーを読み込んでエディターを初期化"""
        openai_key = os.getenv("OPENAI_API_KEY")
        stability_key = os.getenv("STABILITY_API_KEY")
        
        if openai_key:
            self.editors["openai"] = OpenAIImageEditor(openai_key)
        
        if stability_key:
            self.editors["stability"] = StabilityImageEditor(stability_key)
        
        # ローカルエディターは常に利用可能
        self.editors["local"] = LocalImageEditor()
    
    async def edit_image(self, request: ImageEditRequest) -> ImageEditResult:
        """最適なAPIを選択して画像を編集"""
        
        # API優先順位を決定
        api_order = self._determine_api_order(request)
        
        # 各APIを順番に試行
        last_error = None
        for api_name in api_order:
            if api_name in self.editors:
                try:
                    editor = self.editors[api_name]
                    result = await editor.edit_image(request)
                    return result
                except Exception as e:
                    last_error = e
                    print(f"Editor {api_name} failed: {str(e)}")
                    continue
        
        # すべてのエディターが失敗した場合
        raise Exception(f"All editors failed. Last error: {str(last_error)}")
    
    def _determine_api_order(self, request: ImageEditRequest) -> List[str]:
        """リクエストに基づいてAPI優先順位を決定"""
        
        # ユーザーの設定がある場合はそれを優先
        if request.api_preference:
            return [api for api in request.api_preference if api in self.editors]
        
        # 編集タイプに基づく優先順位
        if request.edit_type == "inpaint":
            # インペインティングはStability AIが得意
            default_order = ["stability", "openai", "local"]
        elif request.edit_type == "outpaint":
            # アウトペインティングもStability AI
            default_order = ["stability", "openai", "local"]
        elif request.edit_type == "style_transfer":
            # スタイル転送はOpenAIが得意
            default_order = ["openai", "stability", "local"]
        else:
            # 一般的な修正
            default_order = ["openai", "stability", "local"]
        
        return [api for api in default_order if api in self.editors]
    
    def get_available_editors(self) -> List[str]:
        """利用可能なエディターのリストを取得"""
        return list(self.editors.keys())
    
    def get_editor_info(self) -> Dict[str, Dict[str, Any]]:
        """各エディターの情報を取得"""
        info = {}
        for name, editor in self.editors.items():
            info[name] = {
                "name": editor.name,
                "cost_per_edit": editor.get_edit_cost("modify"),
                "available": True,
                "supported_types": self._get_supported_edit_types(name)
            }
        return info
    
    def _get_supported_edit_types(self, editor_name: str) -> List[str]:
        """エディターがサポートする編集タイプを取得"""
        support_map = {
            "openai": ["modify", "inpaint"],
            "stability": ["modify", "inpaint", "outpaint"],
            "local": ["modify", "style_transfer"]
        }
        return support_map.get(editor_name, ["modify"])


def create_simple_mask(image_data: str, mask_type: str = "center") -> str:
    """簡単なマスクを生成（テスト用）"""
    try:
        # Base64画像をPIL Imageに変換
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # マスク画像を作成
        mask = Image.new('L', image.size, 0)  # 黒いマスク
        draw = ImageDraw.Draw(mask)
        
        width, height = image.size
        
        if mask_type == "center":
            # 中央の円形マスク
            center_x, center_y = width // 2, height // 2
            radius = min(width, height) // 4
            draw.ellipse([
                center_x - radius, center_y - radius,
                center_x + radius, center_y + radius
            ], fill=255)
        
        elif mask_type == "top_half":
            # 上半分のマスク
            draw.rectangle([0, 0, width, height // 2], fill=255)
        
        elif mask_type == "bottom_half":
            # 下半分のマスク
            draw.rectangle([0, height // 2, width, height], fill=255)
        
        # マスクをBase64に変換
        mask_buffer = io.BytesIO()
        mask.save(mask_buffer, format='PNG')
        mask_base64 = base64.b64encode(mask_buffer.getvalue()).decode('utf-8')
        
        return mask_base64
        
    except Exception as e:
        raise Exception(f"Mask creation error: {str(e)}")

