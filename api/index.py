from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

# Import modules
from api_clients import ImageGenerationClient
from content_analyzer import ContentAnalyzer
from image_editor import ImageEditor
from routes.image_generation import image_generation_bp
from routes.image_editing import image_editing_bp
from routes.url_analysis import url_analysis_bp

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure upload folder - use /tmp for Vercel
UPLOAD_FOLDER = '/tmp/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize services
app.image_client = ImageGenerationClient()
app.content_analyzer = ContentAnalyzer()
app.image_editor = ImageEditor()

# Register blueprints
app.register_blueprint(image_generation_bp, url_prefix='/api')
app.register_blueprint(image_editing_bp, url_prefix='/api/edit')
app.register_blueprint(url_analysis_bp, url_prefix='/api')

# Root endpoint
@app.route('/')
def index():
    return jsonify({
        'message': 'AI Image Generation API',
        'version': '1.0.0',
        'endpoints': {
            '/api/generate': 'Generate single image',
            '/api/generate/batch': 'Generate multiple images',
            '/api/edit/image': 'Edit image',
            '/api/health': 'Health check'
        }
    })

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'services': {
            'openai': bool(os.getenv('OPENAI_API_KEY')),
            'stability': bool(os.getenv('STABILITY_API_KEY')),
            'replicate': bool(os.getenv('REPLICATE_API_TOKEN'))
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# For Vercel deployment
def handler(event, context):
    """Vercel serverless function handler"""
    import json
    from urllib.parse import urlparse, parse_qs
    
    try:
        # Extract request information from event
        path = event.get('path', '/')
        method = event.get('httpMethod', 'GET')
        headers = event.get('headers', {})
        body = event.get('body', '')
        query_string = event.get('queryStringParameters', {}) or {}
        
        # Simple routing for common endpoints
        if path == '/api/health':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'API is running',
                    'endpoints': ['/api/health', '/api/generate', '/api/analyze']
                })
            }
        
        elif path == '/api/apis/available':
            if method == 'POST' and body:
                try:
                    data = json.loads(body)
                    api_keys = data.get('api_keys', {})
                    
                    available = []
                    if api_keys.get('openai'):
                        available.append('openai')
                    if api_keys.get('stability'):
                        available.append('stability')
                    if api_keys.get('replicate'):
                        available.append('replicate')
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json'},
                        'body': json.dumps({
                            'available': available,
                            'count': len(available)
                        })
                    }
                except:
                    pass
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'available': [],
                    'count': 0
                })
            }
        
        elif path == '/api/analyze':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'analysis': {
                        'content_type': 'general',
                        'industry': 'general',
                        'style_suggestions': ['professional', 'clean', 'modern'],
                        'color_palette': ['blue', 'white', 'gray'],
                        'recommended_apis': ['openai'],
                        'enhanced_prompt': 'Professional Japanese business image, clean modern style',
                        'composition': {
                            'layout': 'balanced composition',
                            'focus': 'clear subject matter',
                            'aspect': '16:9 or 4:3'
                        }
                    }
                })
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }

# For local development
if __name__ == '__main__':
    app.run(debug=True)