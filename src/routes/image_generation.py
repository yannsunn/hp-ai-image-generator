from flask import Blueprint, request, jsonify, current_app
import asyncio
from typing import Dict, Any, List
import base64

image_generation_bp = Blueprint('image_generation', __name__)

@image_generation_bp.route('/generate', methods=['POST'])
def generate_image():
    """単一画像生成エンドポイント"""
    try:
        data = request.get_json()
        
        # 必須パラメータの検証
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        prompt = data['prompt']
        api = data.get('api', 'auto')
        options = data.get('options', {})
        context = data.get('context', {})
        
        # コンテンツ解析
        analyzer = current_app.content_analyzer
        analysis = analyzer.analyze_prompt(prompt, context)
        
        # プロンプトの拡張
        enhanced_prompt = analysis.prompt_enhancement
        
        # 画像生成
        client = current_app.image_client
        
        # 非同期処理を同期的に実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                client.generate_image(enhanced_prompt, api, options)
            )
        finally:
            loop.close()
        
        if result.error:
            return jsonify({'error': result.error}), 500
        
        # レスポンスの構築
        response = {
            'success': True,
            'image': result.image_base64,
            'metadata': {
                'original_prompt': prompt,
                'enhanced_prompt': enhanced_prompt,
                'api_used': result.api_used,
                'cost': result.cost,
                'analysis': {
                    'content_type': analysis.content_type,
                    'industry': analysis.industry,
                    'style_suggestions': analysis.style_suggestions,
                    'color_palette': analysis.color_palette
                }
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': f'Generation failed: {str(e)}'}), 500

@image_generation_bp.route('/generate/batch', methods=['POST'])
def generate_batch():
    """バッチ画像生成エンドポイント"""
    try:
        data = request.get_json()
        
        # 必須パラメータの検証
        if not data or 'prompts' not in data:
            return jsonify({'error': 'Prompts array is required'}), 400
        
        prompts = data['prompts']
        if not isinstance(prompts, list) or len(prompts) == 0:
            return jsonify({'error': 'Prompts must be a non-empty array'}), 400
        
        # 最大バッチサイズの制限
        if len(prompts) > 10:
            return jsonify({'error': 'Maximum 10 images per batch'}), 400
        
        api = data.get('api', 'auto')
        options = data.get('options', {})
        context = data.get('context', {})
        
        # 各プロンプトの解析と拡張
        analyzer = current_app.content_analyzer
        enhanced_prompts = []
        analyses = []
        
        for prompt in prompts:
            analysis = analyzer.analyze_prompt(prompt, context)
            enhanced_prompts.append(analysis.prompt_enhancement)
            analyses.append(analysis)
        
        # バッチ画像生成
        client = current_app.image_client
        
        # 非同期処理を同期的に実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            results = loop.run_until_complete(
                client.generate_batch(enhanced_prompts, api, options)
            )
        finally:
            loop.close()
        
        # レスポンスの構築
        images = []
        total_cost = 0
        errors = []
        
        for i, (result, prompt, analysis) in enumerate(zip(results, prompts, analyses)):
            if result.error:
                errors.append({
                    'index': i,
                    'prompt': prompt,
                    'error': result.error
                })
            else:
                images.append({
                    'index': i,
                    'image': result.image_base64,
                    'metadata': {
                        'original_prompt': prompt,
                        'enhanced_prompt': enhanced_prompts[i],
                        'api_used': result.api_used,
                        'cost': result.cost,
                        'analysis': {
                            'content_type': analysis.content_type,
                            'industry': analysis.industry,
                            'style_suggestions': analysis.style_suggestions,
                            'color_palette': analysis.color_palette
                        }
                    }
                })
                total_cost += result.cost
        
        response = {
            'success': len(images) > 0,
            'images': images,
            'errors': errors,
            'total_cost': total_cost,
            'summary': {
                'requested': len(prompts),
                'generated': len(images),
                'failed': len(errors)
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': f'Batch generation failed: {str(e)}'}), 500

@image_generation_bp.route('/analyze', methods=['POST'])
def analyze_prompt():
    """プロンプト解析エンドポイント"""
    try:
        data = request.get_json()
        
        if not data or 'prompt' not in data:
            return jsonify({'error': 'Prompt is required'}), 400
        
        prompt = data['prompt']
        context = data.get('context', {})
        
        # コンテンツ解析
        analyzer = current_app.content_analyzer
        analysis = analyzer.analyze_prompt(prompt, context)
        
        # 構図の提案を追加
        composition = analyzer.get_composition_suggestions(analysis.content_type)
        
        response = {
            'success': True,
            'analysis': {
                'content_type': analysis.content_type,
                'industry': analysis.industry,
                'style_suggestions': analysis.style_suggestions,
                'color_palette': analysis.color_palette,
                'recommended_apis': analysis.recommended_apis,
                'enhanced_prompt': analysis.prompt_enhancement,
                'composition': composition
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@image_generation_bp.route('/apis/available', methods=['GET'])
def get_available_apis():
    """利用可能なAPIの一覧を取得"""
    try:
        client = current_app.image_client
        available_apis = client.get_available_apis()
        
        # 各APIの詳細情報
        api_info = {
            'openai': {
                'name': 'OpenAI DALL-E 3',
                'description': 'High-quality, professional images',
                'best_for': ['Business', 'Corporate', 'Professional content'],
                'cost_per_image': 0.04
            },
            'stability': {
                'name': 'Stability AI',
                'description': 'Artistic and creative images',
                'best_for': ['Artistic', 'Illustrations', 'Creative content'],
                'cost_per_image': 0.06
            },
            'replicate': {
                'name': 'Replicate FLUX',
                'description': 'Realistic and authentic images',
                'best_for': ['Photorealistic', 'People', 'Natural scenes'],
                'cost_per_image': 0.015
            }
        }
        
        response = {
            'available': available_apis,
            'details': {api: api_info[api] for api in available_apis if api in api_info}
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get API info: {str(e)}'}), 500

@image_generation_bp.route('/estimate-cost', methods=['POST'])
def estimate_cost():
    """コスト見積もりエンドポイント"""
    try:
        data = request.get_json()
        
        api = data.get('api', 'auto')
        count = data.get('count', 1)
        
        if count < 1 or count > 100:
            return jsonify({'error': 'Count must be between 1 and 100'}), 400
        
        client = current_app.image_client
        
        if api == 'auto':
            # 各APIのコストを計算
            costs = {}
            for available_api in client.get_available_apis():
                costs[available_api] = client.estimate_cost(available_api, count)
            
            response = {
                'estimated_costs': costs,
                'recommended': min(costs, key=costs.get) if costs else None
            }
        else:
            cost = client.estimate_cost(api, count)
            response = {
                'api': api,
                'count': count,
                'estimated_cost': cost
            }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': f'Cost estimation failed: {str(e)}'}), 500