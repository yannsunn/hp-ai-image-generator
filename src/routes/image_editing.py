"""
画像編集APIのルート定義
"""

from flask import Blueprint, request, jsonify
import asyncio
import traceback
from datetime import datetime
import uuid

from ..image_editor import (
    ImageEditManager, 
    ImageEditRequest, 
    create_simple_mask
)

image_editing_bp = Blueprint('image_editing', __name__)

# グローバルな画像編集マネージャー
edit_manager = ImageEditManager()


@image_editing_bp.route('/api/edit/image', methods=['POST'])
def edit_image():
    """画像編集エンドポイント"""
    try:
        data = request.get_json()
        
        # 必須パラメータの検証
        if not data.get('image_data'):
            return jsonify({'error': 'image_data is required'}), 400
        
        if not data.get('edit_instruction'):
            return jsonify({'error': 'edit_instruction is required'}), 400
        
        # リクエストオブジェクトを作成
        edit_request = ImageEditRequest(
            image_data=data['image_data'],
            edit_instruction=data['edit_instruction'],
            edit_type=data.get('edit_type', 'modify'),
            mask_data=data.get('mask_data'),
            strength=float(data.get('strength', 0.8)),
            preserve_composition=data.get('preserve_composition', True),
            api_preference=data.get('api_preference')
        )
        
        # 非同期で画像編集を実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(edit_manager.edit_image(edit_request))
            
            # レスポンスを構築
            response = {
                'edit_id': str(uuid.uuid4()),
                'timestamp': datetime.now().isoformat(),
                'original_instruction': edit_request.edit_instruction,
                'result': {
                    'edited_image': result.edited_image,
                    'original_image': result.original_image,
                    'edit_instruction': result.edit_instruction,
                    'api_used': result.api_used,
                    'cost': result.cost,
                    'edit_time': result.edit_time,
                    'metadata': result.metadata
                }
            }
            
            return jsonify(response)
            
        finally:
            loop.close()
    
    except Exception as e:
        print(f"Image editing error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@image_editing_bp.route('/api/edit/create-mask', methods=['POST'])
def create_mask():
    """マスク生成エンドポイント"""
    try:
        data = request.get_json()
        
        if not data.get('image_data'):
            return jsonify({'error': 'image_data is required'}), 400
        
        mask_type = data.get('mask_type', 'center')
        
        # マスクを生成
        mask_data = create_simple_mask(data['image_data'], mask_type)
        
        response = {
            'mask_data': mask_data,
            'mask_type': mask_type,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Mask creation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@image_editing_bp.route('/api/edit/batch', methods=['POST'])
def batch_edit_images():
    """バッチ画像編集エンドポイント"""
    try:
        data = request.get_json()
        
        if not data.get('images'):
            return jsonify({'error': 'images array is required'}), 400
        
        if not data.get('edit_instruction'):
            return jsonify({'error': 'edit_instruction is required'}), 400
        
        images = data['images']
        edit_instruction = data['edit_instruction']
        edit_type = data.get('edit_type', 'modify')
        strength = float(data.get('strength', 0.8))
        
        # 非同期でバッチ編集を実行
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # 各画像に対して編集リクエストを作成
            edit_requests = []
            for i, image_data in enumerate(images):
                edit_request = ImageEditRequest(
                    image_data=image_data,
                    edit_instruction=edit_instruction,
                    edit_type=edit_type,
                    strength=strength,
                    preserve_composition=data.get('preserve_composition', True),
                    api_preference=data.get('api_preference')
                )
                edit_requests.append(edit_request)
            
            # 並列で編集を実行
            tasks = [edit_manager.edit_image(req) for req in edit_requests]
            results = loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))
            
            # 結果を整理
            successful_results = []
            failed_results = []
            total_cost = 0.0
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    failed_results.append({
                        'index': i,
                        'error': str(result)
                    })
                else:
                    successful_results.append({
                        'index': i,
                        'edited_image': result.edited_image,
                        'api_used': result.api_used,
                        'cost': result.cost,
                        'edit_time': result.edit_time,
                        'metadata': result.metadata
                    })
                    total_cost += result.cost
            
            response = {
                'batch_id': str(uuid.uuid4()),
                'timestamp': datetime.now().isoformat(),
                'edit_instruction': edit_instruction,
                'total_images': len(images),
                'successful_edits': len(successful_results),
                'failed_edits': len(failed_results),
                'total_cost': total_cost,
                'results': successful_results,
                'failures': failed_results
            }
            
            return jsonify(response)
            
        finally:
            loop.close()
    
    except Exception as e:
        print(f"Batch editing error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@image_editing_bp.route('/api/edit/editors/available', methods=['GET'])
def get_available_editors():
    """利用可能な画像編集エンジンの一覧を取得"""
    try:
        available_editors = edit_manager.get_available_editors()
        editor_info = edit_manager.get_editor_info()
        
        response = {
            'available_editors': available_editors,
            'editor_info': editor_info,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Get editors error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@image_editing_bp.route('/api/edit/presets', methods=['GET'])
def get_edit_presets():
    """編集プリセットの一覧を取得"""
    try:
        presets = {
            'basic_adjustments': [
                {
                    'name': '明るくする',
                    'instruction': 'Make this image brighter and more vibrant',
                    'type': 'modify',
                    'strength': 0.6
                },
                {
                    'name': '暗くする',
                    'instruction': 'Make this image darker and more moody',
                    'type': 'modify',
                    'strength': 0.6
                },
                {
                    'name': 'コントラストを上げる',
                    'instruction': 'Increase contrast and make colors more vivid',
                    'type': 'modify',
                    'strength': 0.7
                },
                {
                    'name': 'ソフトにする',
                    'instruction': 'Make this image softer and more gentle',
                    'type': 'modify',
                    'strength': 0.5
                }
            ],
            'style_changes': [
                {
                    'name': 'プロフェッショナル',
                    'instruction': 'Transform this into a professional, business-style image',
                    'type': 'modify',
                    'strength': 0.8
                },
                {
                    'name': 'アーティスティック',
                    'instruction': 'Make this image more artistic and creative',
                    'type': 'modify',
                    'strength': 0.8
                },
                {
                    'name': 'ミニマル',
                    'instruction': 'Simplify this image with a minimalist approach',
                    'type': 'modify',
                    'strength': 0.7
                },
                {
                    'name': 'ヴィンテージ',
                    'instruction': 'Give this image a vintage, retro look',
                    'type': 'modify',
                    'strength': 0.8
                }
            ],
            'color_adjustments': [
                {
                    'name': 'ウォームトーン',
                    'instruction': 'Add warm tones and golden hues to this image',
                    'type': 'modify',
                    'strength': 0.6
                },
                {
                    'name': 'クールトーン',
                    'instruction': 'Add cool tones and blue hues to this image',
                    'type': 'modify',
                    'strength': 0.6
                },
                {
                    'name': 'モノクローム',
                    'instruction': 'Convert this to a stylish black and white image',
                    'type': 'modify',
                    'strength': 0.8
                },
                {
                    'name': 'セピア',
                    'instruction': 'Apply a sepia tone effect to this image',
                    'type': 'modify',
                    'strength': 0.7
                }
            ],
            'background_edits': [
                {
                    'name': '背景をぼかす',
                    'instruction': 'Blur the background while keeping the main subject sharp',
                    'type': 'modify',
                    'strength': 0.7
                },
                {
                    'name': '背景を白に',
                    'instruction': 'Change the background to clean white',
                    'type': 'inpaint',
                    'strength': 0.8,
                    'requires_mask': True
                },
                {
                    'name': '背景を透明に',
                    'instruction': 'Remove the background and make it transparent',
                    'type': 'inpaint',
                    'strength': 0.9,
                    'requires_mask': True
                },
                {
                    'name': '自然な背景に',
                    'instruction': 'Replace background with a natural outdoor scene',
                    'type': 'inpaint',
                    'strength': 0.8,
                    'requires_mask': True
                }
            ]
        }
        
        return jsonify(presets)
    
    except Exception as e:
        print(f"Get presets error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@image_editing_bp.route('/api/edit/suggestions', methods=['POST'])
def get_edit_suggestions():
    """画像に基づく編集提案を生成"""
    try:
        data = request.get_json()
        
        if not data.get('image_data'):
            return jsonify({'error': 'image_data is required'}), 400
        
        # 画像の内容を分析して編集提案を生成
        # 実際の実装では画像認識AIを使用
        suggestions = [
            {
                'category': '品質向上',
                'suggestions': [
                    {
                        'name': '明度調整',
                        'instruction': 'Adjust brightness and exposure for better visibility',
                        'confidence': 0.8
                    },
                    {
                        'name': 'シャープネス向上',
                        'instruction': 'Enhance sharpness and clarity',
                        'confidence': 0.7
                    }
                ]
            },
            {
                'category': 'スタイル改善',
                'suggestions': [
                    {
                        'name': 'プロフェッショナル化',
                        'instruction': 'Make this image more professional and polished',
                        'confidence': 0.9
                    },
                    {
                        'name': 'カラーバランス調整',
                        'instruction': 'Improve color balance and saturation',
                        'confidence': 0.8
                    }
                ]
            }
        ]
        
        response = {
            'suggestions': suggestions,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Get suggestions error: {str(e)}")
        return jsonify({'error': str(e)}), 500

