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

# For Vercel deployment - must be named 'app'
# Vercel looks for an 'app' variable in the index.py file