from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add src directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import modules
from api_clients import ImageGenerationClient
from content_analyzer import ContentAnalyzer
from image_editor import ImageEditor
from routes.image_generation import image_generation_bp
from routes.image_editing import image_editing_bp

# Initialize Flask app
app = Flask(__name__, static_folder='../static', static_url_path='')
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
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

# Serve static files
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

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
app = app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)