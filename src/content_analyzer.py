import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class ContentAnalysis:
    """コンテンツ解析結果のデータクラス"""
    content_type: str
    industry: str
    style_suggestions: List[str]
    color_palette: List[str]
    recommended_apis: List[str]
    prompt_enhancement: str

class ContentAnalyzer:
    """ホームページコンテンツ解析エンジン"""
    
    def __init__(self):
        # 業界別のスタイルマッピング
        self.industry_styles = {
            'technology': {
                'colors': ['blue', 'white', 'gray', 'black'],
                'styles': ['modern', 'minimalist', 'clean', 'futuristic'],
                'elements': ['geometric shapes', 'abstract patterns', 'tech devices']
            },
            'healthcare': {
                'colors': ['blue', 'green', 'white', 'teal'],
                'styles': ['professional', 'clean', 'trustworthy', 'calming'],
                'elements': ['medical symbols', 'nature', 'people smiling']
            },
            'education': {
                'colors': ['blue', 'green', 'orange', 'yellow'],
                'styles': ['friendly', 'approachable', 'inspiring', 'bright'],
                'elements': ['books', 'students', 'campus', 'learning tools']
            },
            'restaurant': {
                'colors': ['warm tones', 'red', 'orange', 'brown'],
                'styles': ['inviting', 'appetizing', 'cozy', 'elegant'],
                'elements': ['food', 'dining atmosphere', 'chef', 'ingredients']
            },
            'fashion': {
                'colors': ['black', 'white', 'gold', 'brand colors'],
                'styles': ['elegant', 'trendy', 'sophisticated', 'artistic'],
                'elements': ['models', 'clothing', 'accessories', 'lifestyle']
            },
            'finance': {
                'colors': ['blue', 'green', 'gray', 'gold'],
                'styles': ['professional', 'trustworthy', 'stable', 'corporate'],
                'elements': ['graphs', 'buildings', 'currency symbols', 'handshakes']
            }
        }
        
        # コンテンツタイプのパターン
        self.content_patterns = {
            'hero': ['hero', 'banner', 'header', 'main visual', 'top'],
            'about': ['about', 'company', 'who we are', 'mission', 'story'],
            'service': ['service', 'what we do', 'solutions', 'offering'],
            'product': ['product', 'item', 'catalog', 'showcase'],
            'team': ['team', 'staff', 'people', 'members', 'leadership'],
            'testimonial': ['testimonial', 'review', 'feedback', 'client says'],
            'contact': ['contact', 'get in touch', 'reach us', 'location'],
            'cta': ['call to action', 'cta', 'button', 'sign up', 'get started']
        }
    
    def analyze_prompt(self, prompt: str, context: Optional[Dict[str, str]] = None) -> ContentAnalysis:
        """プロンプトを解析して最適な画像生成パラメータを提案"""
        prompt_lower = prompt.lower()
        
        # 業界の検出
        industry = self._detect_industry(prompt_lower, context)
        
        # コンテンツタイプの検出
        content_type = self._detect_content_type(prompt_lower, context)
        
        # スタイル提案の生成
        style_suggestions = self._generate_style_suggestions(industry, content_type)
        
        # カラーパレットの提案
        color_palette = self._suggest_color_palette(industry, prompt_lower)
        
        # 推奨APIの選択
        recommended_apis = self._recommend_apis(content_type, style_suggestions)
        
        # プロンプトの拡張
        prompt_enhancement = self._enhance_prompt(prompt, industry, content_type, style_suggestions)
        
        return ContentAnalysis(
            content_type=content_type,
            industry=industry,
            style_suggestions=style_suggestions,
            color_palette=color_palette,
            recommended_apis=recommended_apis,
            prompt_enhancement=prompt_enhancement
        )
    
    def _detect_industry(self, prompt: str, context: Optional[Dict[str, str]]) -> str:
        """プロンプトから業界を検出"""
        if context and 'industry' in context:
            return context['industry']
        
        # キーワードベースの業界検出
        industry_keywords = {
            'technology': ['tech', 'software', 'app', 'digital', 'ai', 'data', 'cloud'],
            'healthcare': ['health', 'medical', 'clinic', 'hospital', 'doctor', 'patient'],
            'education': ['school', 'university', 'learning', 'education', 'student', 'course'],
            'restaurant': ['food', 'restaurant', 'cafe', 'dining', 'chef', 'menu', 'cuisine'],
            'fashion': ['fashion', 'clothing', 'style', 'boutique', 'designer', 'wear'],
            'finance': ['finance', 'bank', 'investment', 'money', 'trading', 'insurance']
        }
        
        for industry, keywords in industry_keywords.items():
            if any(keyword in prompt for keyword in keywords):
                return industry
        
        return 'general'
    
    def _detect_content_type(self, prompt: str, context: Optional[Dict[str, str]]) -> str:
        """プロンプトからコンテンツタイプを検出"""
        if context and 'content_type' in context:
            return context['content_type']
        
        for content_type, patterns in self.content_patterns.items():
            if any(pattern in prompt for pattern in patterns):
                return content_type
        
        return 'general'
    
    def _generate_style_suggestions(self, industry: str, content_type: str) -> List[str]:
        """業界とコンテンツタイプに基づいてスタイルを提案"""
        base_styles = []
        
        # 業界別スタイル
        if industry in self.industry_styles:
            base_styles.extend(self.industry_styles[industry]['styles'])
        
        # コンテンツタイプ別の追加スタイル
        content_styles = {
            'hero': ['eye-catching', 'impactful', 'high-quality'],
            'about': ['authentic', 'warm', 'trustworthy'],
            'service': ['professional', 'clear', 'informative'],
            'product': ['detailed', 'attractive', 'commercial'],
            'team': ['friendly', 'approachable', 'professional'],
            'testimonial': ['genuine', 'relatable', 'positive'],
            'contact': ['welcoming', 'accessible', 'clear'],
            'cta': ['compelling', 'action-oriented', 'prominent']
        }
        
        if content_type in content_styles:
            base_styles.extend(content_styles[content_type])
        
        # 重複を削除して返す
        return list(set(base_styles))[:5]
    
    def _suggest_color_palette(self, industry: str, prompt: str) -> List[str]:
        """業界とプロンプトに基づいてカラーパレットを提案"""
        if industry in self.industry_styles:
            base_colors = self.industry_styles[industry]['colors']
        else:
            base_colors = ['blue', 'white', 'gray']
        
        # プロンプトに色が含まれている場合は追加
        color_words = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 
                      'black', 'white', 'gray', 'brown', 'gold', 'silver']
        
        mentioned_colors = [color for color in color_words if color in prompt]
        
        # 基本色と言及された色を組み合わせ
        final_palette = list(set(base_colors + mentioned_colors))[:5]
        
        return final_palette
    
    def _recommend_apis(self, content_type: str, style_suggestions: List[str]) -> List[str]:
        """コンテンツタイプとスタイルに基づいて推奨APIを選択"""
        recommendations = []
        
        # スタイルベースの推奨
        if any(style in style_suggestions for style in ['professional', 'corporate', 'high-quality']):
            recommendations.append('openai')
        
        if any(style in style_suggestions for style in ['artistic', 'creative', 'stylized']):
            recommendations.append('stability')
        
        if any(style in style_suggestions for style in ['realistic', 'authentic', 'genuine']):
            recommendations.append('replicate')
        
        # コンテンツタイプベースの推奨
        content_api_mapping = {
            'hero': ['openai', 'replicate'],
            'product': ['openai', 'stability'],
            'team': ['replicate', 'openai'],
            'testimonial': ['replicate'],
            'general': ['openai', 'stability', 'replicate']
        }
        
        if content_type in content_api_mapping:
            recommendations.extend(content_api_mapping[content_type])
        
        # 重複を削除して優先順位順に返す
        seen = set()
        return [x for x in recommendations if not (x in seen or seen.add(x))][:3]
    
    def _enhance_prompt(self, original_prompt: str, industry: str, content_type: str, styles: List[str]) -> str:
        """プロンプトを拡張して品質を向上"""
        enhancements = []
        
        # スタイルの追加
        if styles:
            enhancements.append(f"{', '.join(styles[:3])} style")
        
        # 業界特有の要素を追加
        if industry in self.industry_styles:
            elements = self.industry_styles[industry].get('elements', [])
            if elements and content_type != 'general':
                enhancements.append(f"incorporating {elements[0]}")
        
        # 品質指定の追加
        quality_terms = ['high-resolution', 'professional quality', 'detailed']
        enhancements.append(quality_terms[0])
        
        # ホームページ用の指定
        enhancements.append('suitable for modern website')
        
        # 拡張プロンプトの構築
        enhanced = f"{original_prompt}, {', '.join(enhancements)}"
        
        return enhanced
    
    def get_composition_suggestions(self, content_type: str) -> Dict[str, str]:
        """コンテンツタイプに基づいて構図の提案を返す"""
        compositions = {
            'hero': {
                'layout': 'wide panoramic view',
                'focus': 'central focal point with supporting elements',
                'aspect': '16:9 or 21:9 for full-width display'
            },
            'about': {
                'layout': 'balanced composition',
                'focus': 'human element or company values visualization',
                'aspect': '4:3 or 16:9'
            },
            'service': {
                'layout': 'clean and organized',
                'focus': 'service benefits visualization',
                'aspect': '1:1 or 4:3 for grid layouts'
            },
            'product': {
                'layout': 'product-centered',
                'focus': 'clear product visibility with context',
                'aspect': '1:1 for e-commerce, 4:3 for lifestyle'
            },
            'team': {
                'layout': 'group or individual portraits',
                'focus': 'friendly and approachable poses',
                'aspect': '3:4 for portraits, 16:9 for group shots'
            }
        }
        
        return compositions.get(content_type, {
            'layout': 'balanced composition',
            'focus': 'clear subject matter',
            'aspect': '16:9 or 4:3'
        })