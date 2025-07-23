import os
import base64
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from openai import OpenAI
import replicate
import requests
from io import BytesIO
from PIL import Image

@dataclass
class GenerationResult:
    """画像生成結果のデータクラス"""
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    api_used: Optional[str] = None
    cost: float = 0.0
    error: Optional[str] = None

class ImageGenerationClient:
    """画像生成APIの統合クライアント"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.stability_api_key = os.getenv('STABILITY_API_KEY')
        self.replicate_api_token = os.getenv('REPLICATE_API_TOKEN')
        
        # APIクライアントの初期化
        if self.openai_api_key:
            self.openai_client = OpenAI(api_key=self.openai_api_key)
        
        if self.replicate_api_token:
            os.environ["REPLICATE_API_TOKEN"] = self.replicate_api_token
        
        # API料金（概算）
        self.pricing = {
            'openai': {'dall-e-3': 0.04},  # per image
            'stability': {'stable-diffusion': 0.002},  # per step
            'replicate': {'flux': 0.003}  # per second
        }
    
    async def generate_image(self, prompt: str, api: str = 'auto', options: Dict[str, Any] = None) -> GenerationResult:
        """単一の画像を生成"""
        if api == 'auto':
            api = self._select_best_api(prompt)
        
        try:
            if api == 'openai':
                return await self._generate_openai(prompt, options or {})
            elif api == 'stability':
                return await self._generate_stability(prompt, options or {})
            elif api == 'replicate':
                return await self._generate_replicate(prompt, options or {})
            else:
                return GenerationResult(error=f"Unknown API: {api}")
        except Exception as e:
            return GenerationResult(error=f"Generation failed: {str(e)}")
    
    async def generate_batch(self, prompts: List[str], api: str = 'auto', options: Dict[str, Any] = None) -> List[GenerationResult]:
        """複数の画像を並列生成"""
        tasks = []
        for prompt in prompts:
            task = self.generate_image(prompt, api, options)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        return results
    
    def _select_best_api(self, prompt: str) -> str:
        """プロンプトに基づいて最適なAPIを選択"""
        prompt_lower = prompt.lower()
        
        # 高品質・プロフェッショナルな画像はDALL-E 3
        if any(keyword in prompt_lower for keyword in ['professional', 'business', 'corporate', 'high quality', 'detailed']):
            if self.openai_api_key:
                return 'openai'
        
        # アーティスティックな画像はStable Diffusion
        if any(keyword in prompt_lower for keyword in ['artistic', 'painting', 'illustration', 'anime', 'fantasy']):
            if self.stability_api_key:
                return 'stability'
        
        # リアルな画像はFLUX
        if any(keyword in prompt_lower for keyword in ['realistic', 'photo', 'person', 'portrait']):
            if self.replicate_api_token:
                return 'replicate'
        
        # デフォルトは利用可能な最初のAPI
        if self.openai_api_key:
            return 'openai'
        elif self.stability_api_key:
            return 'stability'
        elif self.replicate_api_token:
            return 'replicate'
        else:
            return None
    
    async def _generate_openai(self, prompt: str, options: Dict[str, Any]) -> GenerationResult:
        """OpenAI DALL-E 3で画像生成"""
        if not self.openai_api_key:
            return GenerationResult(error="OpenAI API key not configured")
        
        try:
            response = self.openai_client.images.generate(
                model=options.get('model', 'dall-e-3'),
                prompt=prompt,
                size=options.get('size', '1024x1024'),
                quality=options.get('quality', 'standard'),
                n=1
            )
            
            image_url = response.data[0].url
            
            # URLから画像をダウンロードしてBase64に変換
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as resp:
                    image_data = await resp.read()
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            return GenerationResult(
                image_url=image_url,
                image_base64=f"data:image/png;base64,{image_base64}",
                api_used='openai',
                cost=self.pricing['openai']['dall-e-3']
            )
        except Exception as e:
            return GenerationResult(error=f"OpenAI generation failed: {str(e)}")
    
    async def _generate_stability(self, prompt: str, options: Dict[str, Any]) -> GenerationResult:
        """Stability AI Stable Diffusionで画像生成"""
        if not self.stability_api_key:
            return GenerationResult(error="Stability API key not configured")
        
        try:
            url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
            
            headers = {
                "Accept": "application/json",
                "Authorization": f"Bearer {self.stability_api_key}"
            }
            
            body = {
                "text_prompts": [{"text": prompt, "weight": 1}],
                "cfg_scale": options.get('cfg_scale', 7),
                "height": options.get('height', 1024),
                "width": options.get('width', 1024),
                "steps": options.get('steps', 30),
                "samples": 1
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, headers=headers) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        return GenerationResult(error=f"Stability API error: {error_text}")
                    
                    data = await response.json()
                    image_base64 = data['artifacts'][0]['base64']
                    
                    return GenerationResult(
                        image_base64=f"data:image/png;base64,{image_base64}",
                        api_used='stability',
                        cost=self.pricing['stability']['stable-diffusion'] * body['steps']
                    )
        except Exception as e:
            return GenerationResult(error=f"Stability generation failed: {str(e)}")
    
    async def _generate_replicate(self, prompt: str, options: Dict[str, Any]) -> GenerationResult:
        """Replicate FLUXで画像生成"""
        if not self.replicate_api_token:
            return GenerationResult(error="Replicate API token not configured")
        
        try:
            # Run the model
            output = replicate.run(
                "black-forest-labs/flux-schnell",
                input={
                    "prompt": prompt,
                    "num_outputs": 1,
                    "aspect_ratio": options.get('aspect_ratio', '1:1'),
                    "output_format": "png",
                    "output_quality": options.get('quality', 80)
                }
            )
            
            if output and len(output) > 0:
                image_url = output[0]
                
                # URLから画像をダウンロードしてBase64に変換
                async with aiohttp.ClientSession() as session:
                    async with session.get(image_url) as resp:
                        image_data = await resp.read()
                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                
                return GenerationResult(
                    image_url=image_url,
                    image_base64=f"data:image/png;base64,{image_base64}",
                    api_used='replicate',
                    cost=self.pricing['replicate']['flux'] * 5  # 概算5秒
                )
            else:
                return GenerationResult(error="No output from Replicate")
        except Exception as e:
            return GenerationResult(error=f"Replicate generation failed: {str(e)}")
    
    def get_available_apis(self) -> List[str]:
        """利用可能なAPIのリストを取得"""
        available = []
        if self.openai_api_key:
            available.append('openai')
        if self.stability_api_key:
            available.append('stability')
        if self.replicate_api_token:
            available.append('replicate')
        return available
    
    def estimate_cost(self, api: str, count: int = 1) -> float:
        """生成コストの見積もり"""
        if api == 'openai':
            return self.pricing['openai']['dall-e-3'] * count
        elif api == 'stability':
            return self.pricing['stability']['stable-diffusion'] * 30 * count  # 30 steps
        elif api == 'replicate':
            return self.pricing['replicate']['flux'] * 5 * count  # 5 seconds
        return 0.0