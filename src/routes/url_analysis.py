from flask import Blueprint, request, jsonify
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
import openai
import os

url_analysis_bp = Blueprint('url_analysis', __name__)

@url_analysis_bp.route('/analyze/url', methods=['POST'])
def analyze_url():
    """URLからコンテンツを解析して画像生成用のプロンプトを生成"""
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URLが指定されていません'}), 400
        
        # URLの妥当性チェック
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return jsonify({'error': '無効なURLです'}), 400
        
        # ウェブページの取得
        try:
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
        except requests.RequestException as e:
            return jsonify({'error': f'ウェブページの取得に失敗しました: {str(e)}'}), 400
        
        # HTMLの解析
        soup = BeautifulSoup(response.content, 'html.parser', from_encoding=response.encoding)
        
        # メタデータの取得
        title = soup.find('title').text if soup.find('title') else ''
        description = ''
        
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            description = meta_desc.get('content', '')
        
        # OGP情報の取得
        og_title = soup.find('meta', attrs={'property': 'og:title'})
        og_description = soup.find('meta', attrs={'property': 'og:description'})
        
        if og_title:
            title = og_title.get('content', title)
        if og_description:
            description = og_description.get('content', description)
        
        # 本文テキストの抽出（最初の500文字）
        for script in soup(["script", "style"]):
            script.decompose()
        
        text_content = soup.get_text()
        lines = (line.strip() for line in text_content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text_content = ' '.join(chunk for chunk in chunks if chunk)[:500]
        
        # 業界の推定
        industry = detect_industry(title + ' ' + description + ' ' + text_content)
        
        # コンテンツタイプの推定
        content_type = detect_content_type(parsed_url.path, title)
        
        # AIを使用してプロンプトを生成
        suggested_prompt = generate_prompt_from_content(
            title=title,
            description=description,
            text_content=text_content,
            industry=industry,
            content_type=content_type,
            url=url
        )
        
        return jsonify({
            'success': True,
            'content': {
                'title': title,
                'description': description,
                'text_preview': text_content[:200] + '...' if len(text_content) > 200 else text_content
            },
            'industry': industry,
            'content_type': content_type,
            'suggested_prompt': suggested_prompt
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def detect_industry(text):
    """テキストから業界を推定"""
    text_lower = text.lower()
    
    industry_keywords = {
        'technology': ['技術', 'テクノロジー', 'it', 'ソフトウェア', 'アプリ', 'システム', 'デジタル'],
        'healthcare': ['医療', '健康', '病院', 'クリニック', '医師', '看護', 'ヘルスケア'],
        'education': ['教育', '学習', '学校', '大学', '塾', '研修', 'eラーニング'],
        'restaurant': ['レストラン', '飲食', '料理', 'カフェ', '食事', 'グルメ', 'フード'],
        'fashion': ['ファッション', '服', 'アパレル', '衣類', 'ブランド', 'コーディネート'],
        'finance': ['金融', '銀行', '保険', '投資', 'ローン', '資産', 'マネー']
    }
    
    scores = {}
    for industry, keywords in industry_keywords.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            scores[industry] = score
    
    if scores:
        return max(scores, key=scores.get)
    return 'general'

def detect_content_type(path, title):
    """URLパスとタイトルからコンテンツタイプを推定"""
    path_lower = path.lower()
    title_lower = title.lower()
    
    if any(keyword in path_lower or keyword in title_lower for keyword in ['about', '会社', '概要', '私たち']):
        return 'about'
    elif any(keyword in path_lower or keyword in title_lower for keyword in ['service', 'サービス', '事業']):
        return 'service'
    elif any(keyword in path_lower or keyword in title_lower for keyword in ['product', '商品', '製品']):
        return 'product'
    elif any(keyword in path_lower or keyword in title_lower for keyword in ['team', 'スタッフ', 'メンバー']):
        return 'team'
    elif path == '/' or 'home' in path_lower or 'トップ' in title_lower:
        return 'hero'
    
    return 'general'

def generate_prompt_from_content(title, description, text_content, industry, content_type, url):
    """コンテンツ情報からプロンプトを生成"""
    
    # 日本向けの設定を含むシステムプロンプト
    system_prompt = """あなたは日本のウェブサイト用の画像生成プロンプトを作成する専門家です。
以下の情報を基に、そのウェブサイトに最適な画像を生成するためのプロンプトを作成してください。

重要な要件：
1. 登場人物は必ず日本人の外見にしてください
2. 文字やテキストが含まれる場合は日本語にしてください
3. 日本の文化やビジネス慣習に合った雰囲気にしてください
4. 写実的でプロフェッショナルな画像になるようにしてください

プロンプトは英語で作成し、以下の要素を含めてください：
- 画像のスタイル（photorealistic, professional）
- 被写体の詳細（日本人であることを明記）
- 環境や背景
- 照明や雰囲気
- 色調"""

    # ユーザープロンプト
    user_prompt = f"""
ウェブサイト情報：
- URL: {url}
- タイトル: {title}
- 説明: {description}
- 業界: {industry}
- コンテンツタイプ: {content_type}
- 本文抜粋: {text_content[:200]}...

このウェブサイトの{content_type}セクションに適した画像生成プロンプトを作成してください。
"""

    try:
        openai.api_key = os.getenv('OPENAI_API_KEY')
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=200,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        # フォールバックプロンプト
        fallback_prompts = {
            'hero': f"Professional photorealistic image of Japanese business people in modern {industry} office, bright natural lighting, confident poses, clean minimal background",
            'about': f"Professional team photo of Japanese {industry} company employees, modern office setting, friendly atmosphere, natural lighting",
            'service': f"Professional image showcasing Japanese {industry} service in action, clean modern environment, focus on quality and professionalism",
            'product': f"High-quality product photography for Japanese {industry} market, clean white background, professional lighting, detail focused",
            'team': f"Professional portrait of Japanese {industry} team members, modern office background, warm lighting, approachable expressions",
            'general': f"Professional image for Japanese {industry} website, modern clean aesthetic, natural lighting, culturally appropriate"
        }
        
        return fallback_prompts.get(content_type, fallback_prompts['general'])