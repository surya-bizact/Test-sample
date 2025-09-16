import os
import sys
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory, current_app
from flask_cors import CORS
from configs.extensions import mail
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId
from dotenv import load_dotenv
import traceback
from routes.admin import admin_bp

# Import email utilities
from services.email_utils import generate_verification_token, send_verification_email, send_welcome_email, verify_token

import logging
load_dotenv()

# Set environment to development if not set
os.environ['FLASK_ENV'] = os.getenv('FLASK_ENV', 'development')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='client/build"', static_url_path='')
app.config.from_object('configs.config.Config')

# Set environment in app config
app.config['ENV'] = os.getenv('FLASK_ENV', 'development')
logger.info(f"Running in {app.config['ENV']} mode")

# Initialize Flask-Mail
from configs.extensions import init_mail
init_mail(app)

app.register_blueprint(admin_bp)

CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
port = int(os.getenv("PORT", 5000))       # fallback 5000
debug = os.getenv("DEBUG", "True") == "True"

# Initialize MongoDB Atlas connection
client = MongoClient(os.getenv('MONGO_URI'))
db = client.altarmaker

logger.info(f"MongoDB connected: {db}")

# MongoDB connection validation
def get_db():
    """Get database with connection validation"""
    try:
        # Test the connection
        client.admin.command('ping')
        return db
    except Exception as e:
        logger.info(f"MongoDB connection error: {e}")
        return None

def validate_db_connection():
    """Validate MongoDB connection"""
    try:
        db_instance = get_db()
        if db_instance:
            # Test the connection
            client.admin.command('ping')
            return True
        return False
    except Exception as e:
        logger.info(f"MongoDB connection error: {e}")
        return False

# Enable CORS with specific origins and headers
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['CORS_SUPPORTS_CREDENTIALS'] = True

# Configure CORS with specific settings
cors = CORS(
    app,
    resources={
        r"/api/*": {
            "origins": CORS_ORIGINS,  # Single origin to avoid duplicates
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "X-CSRFToken"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "X-CSRFToken", "Content-Length"],
            "max_age": 3600,
        }
    },
    supports_credentials=True
)

# Configure session
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=False,  # Set to True in production with HTTPS
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(days=1)
)

# Session Configuration
SESSION_EXPIRATION = 24 * 60 * 60  # 24 hours



def create_user_session(user_id, username, role):
    """Create user session data"""
    session['user_id'] = str(user_id)
    session['username'] = username
    session['role'] = role
    session['logged_in'] = True
    session.permanent = True
    app.permanent_session_lifetime = timedelta(seconds=SESSION_EXPIRATION)

def get_current_user():
    """Get current user from session"""
    if session.get('logged_in'):
        return {
            'user_id': session.get('user_id'),
            'username': session.get('username'),
            'role': session.get('role')
        }
    return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_data = get_current_user()
        if not user_data:
            return jsonify({'error': 'Authentication required'}), 401
        
        request.user_data = user_data
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user_data'):
            return jsonify({'error': 'Authentication required'}), 401
        
        if request.user_data.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return f(*args, **kwargs)
    return decorated_function





@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_instance = get_db()
        
        if db_instance is not None:
            # Test the connection
            try:
                client.admin.command('ping')
                return jsonify({
                    'status': 'healthy', 
                    'message': 'AltarMaker API is running',
                    'database': 'connected'
                })
            except Exception as e:
                return jsonify({
                    'status': 'unhealthy',
                    'message': 'Database connection failed',
                    'database': 'disconnected'
                }), 500
        else:
            return jsonify({
                'status': 'unhealthy',
                'message': 'Database connection failed',
                'database': 'disconnected'
            }), 500
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'database': 'error'
        }), 500



@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        role = data.get('role', 'user')
        
        if not username or not password or not email:
            return jsonify({'error': 'Username, password, and email are required'}), 400
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Please enter a valid email address'}), 400
        
        # Prevent admin registration through public API
        if role == 'admin':
            return jsonify({'error': 'Admin registration is not allowed through public API'}), 403
        
        # Check if user already exists
        try:
            existing_user = db.users.find_one({'$or': [{'email': email}, {'username': username}]})
            if existing_user:
                return jsonify({'error': 'User with this email or username already exists'}), 409
            
            # Generate verification token
            verification_token = generate_verification_token(email)
            
            # Create new user (always as regular user)
            user_data = {
                'username': username,
                'email': email,
                'password': generate_password_hash(password),
                'role': 'user',  # Always create as user
                'email_verified': False,  # Email not verified yet
                'verification_token': verification_token,
                'created_at': datetime.now(),
                'last_login': None,
                'is_active': True
            }
            
            # Insert user into database
            result = db.users.insert_one(user_data)
            user_id = result.inserted_id
            
            # Send verification email
            try:
                verification_sent = send_verification_email(email, verification_token)
                if not verification_sent:
                    # If email fails to send, delete the user and return error
                    db.users.delete_one({'_id': user_id})
                    return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500
            except Exception as e:
                db.users.delete_one({'_id': user_id})
                logger.error(f"Failed to send verification email: {str(e)}")
                return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500
            
            # Prepare user data for response
            user_data['_id'] = str(user_id)
            del user_data['password']
            del user_data['verification_token']
            
            current_app.logger.info(f"User {username} registered successfully, verification email sent")
            return jsonify({
                'message': 'Registration successful! Please check your email to verify your account before logging in.',
                'user': user_data
            }), 201
            
        except Exception as e:
            logger.error(f"Database error during registration: {str(e)}")
            return jsonify({'error': 'Registration failed. Please try again.'}), 500
        
    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/verify-email', methods=['GET'])
def verify_email():
    """Verify user's email using the verification token"""
    try:
        token = request.args.get('token')
        logger.info(f"Verification attempt with token: {token}")
        
        if not token:
            logger.info("Error: No token provided")
            return jsonify({
                'error': 'Verification link is invalid',
                'message': 'The verification link is missing the required token. Please try the link from your email again or request a new verification email.',
                'code': 'MISSING_TOKEN'
            }), 400
        
        # Verify token and get email
        email = verify_token(token)
        logger.info(f"Decoded email from token: {email}")
        
        if not email:
            logger.info("Error: Invalid or expired token")
            return jsonify({
                'error': 'Verification link has expired or is invalid',
                'message': 'This verification link has expired. Please request a new verification email.',
                'code': 'INVALID_OR_EXPIRED_TOKEN',
                'can_retry': True
            }), 400
        
        # Find user by email (case-insensitive search)
        user = db.users.find_one({
            'email': {'$regex': f'^{email}$', '$options': 'i'},
            'verification_token': token
        })
        
        logger.info(f"User found in DB: {user is not None}")
        
        if not user:
            # Check if user is already verified
            existing_user = db.users.find_one({
                'email': {'$regex': f'^{email}$', '$options': 'i'},
                'email_verified': True
            })
            
            if existing_user:
                logger.info(f"User {email} is already verified")
                return jsonify({
                    'message': 'Your email has already been verified. You can now log in.',
                    'code': 'ALREADY_VERIFIED',
                    'redirect': '/login?verified=true',
                    'email': email
                }), 200
                
            logger.info(f"No unverified user found with email: {email}")
            return jsonify({
                'error': 'Verification failed',
                'message': 'We could not verify your email. The verification link may be invalid or expired. Please request a new verification email.',
                'code': 'VERIFICATION_FAILED',
                'can_retry': True,
                'email': email  # Include email for retry functionality
            }), 400
        
        # Check if verification was sent within the last 15 minutes
        verification_sent_at = user.get('verification_sent_at')
        if verification_sent_at:
            time_since_sent = datetime.utcnow() - verification_sent_at
            if time_since_sent.total_seconds() > 900:  # 15 minutes
                logger.info(f"Verification link expired for user {email}")
                return jsonify({
                    'error': 'Verification link has expired',
                    'message': 'This verification link has expired. Please request a new verification email.',
                    'code': 'VERIFICATION_LINK_EXPIRED',
                    'can_retry': True,
                    'email': email
                }), 400
        
        # Update user as verified
        result = db.users.update_one(
            {'_id': user['_id']},
            {
                '$set': {
                    'email_verified': True,
                    'verification_token': None,  # Clear the token after verification
                    'verified_at': datetime.utcnow()
                },
                '$unset': {
                    'verification_sent_at': ''
                }
            }
        )
        
        logger.info(f"Update result - Matched: {result.matched_count}, Modified: {result.modified_count}")
        
        # Send welcome email
        try:
            send_welcome_email(email, user['username'])
            logger.info(f"Welcome email sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send welcome email: {str(e)}")
            # Continue even if welcome email fails
        
        # Return success response with redirect URL
        return jsonify({
            'message': 'Email verified successfully! You can now log in.',
            'code': 'VERIFICATION_SUCCESS',
            'redirect': '/login?verified=true',
            'user_id': str(user['_id']),
            'email': user['email']
        }), 200
        
    except Exception as e:
        logger.error(f"Error in verify_email: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'An error occurred during email verification',
            'message': 'We encountered an error while verifying your email. Please try again or contact support if the problem persists.',
            'code': 'VERIFICATION_ERROR'
        }), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    """Login user"""
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    # Log request details for debugging
    logger.info(f"Login request received. Headers: {dict(request.headers)}")
    logger.info(f"Request data: {request.get_data(as_text=True)}")

    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data in request")
            return jsonify({'error': 'No data provided'}), 400
            
        logger.info(f"Login attempt with data: {data}")
        
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not username or not password:
            logger.error(f"Missing credentials. Username: {'provided' if username else 'missing'}, Password: {'provided' if password else 'missing'}")
            return jsonify({'error': 'Username and password are required'}), 400
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        try:
            # Find user by username or email
            user = db.users.find_one({
                '$or': [
                    {'username': username},
                    {'email': username}
                ]
            })
            
            if not user:
                logger.info(f"Login failed: User {username} not found")
                return jsonify({'error': 'No account found with this username/email'}), 401
            
            # Check password
            if not check_password_hash(user['password'], password):
                logger.info(f"Login failed: Invalid password for user {username}")
                return jsonify({'error': 'Incorrect password'}), 401
            
            # Check role if specified
            if role and user.get('role') != role:
                logger.info(f"Login failed: Invalid role for user {username}. Expected {role}, got {user.get('role')}")
                return jsonify({'error': f'Invalid role. Expected {role}'}), 401
            
            # Check if user is active
            if not user.get('is_active', True):
                logger.info(f"Login failed: Inactive account for user {username}")
                return jsonify({'error': 'Your account has been deactivated. Please contact support.'}), 403
                
            # Log user details for debugging
            logger.info(f"User found: {user.get('username')}, role: {user.get('role')}")
            
            # Update last login
            db.users.update_one(
                {'_id': user['_id']},
                {'$set': {'last_login': datetime.now()}}
            )
            
            # Create user session
            create_user_session(user['_id'], user['username'], user['role'])
            logger.info(f"User {username} logged in successfully")
            
            user_data = {
                '_id': str(user['_id']),
                'username': user['username'],
                'email': user.get('email'),
                'role': user['role'],
                'created_at': user.get('created_at', datetime.now().isoformat()),
                'last_login': user.get('last_login', datetime.now().isoformat())
            }
            
            response = jsonify({
                'message': 'Login successful',
                'user': user_data
            })
            
            # Set CORS headers
            response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            
            return response, 200
            
        except Exception as e:
            logger.error(f"Database error during login: {str(e)}", exc_info=True)
            return jsonify({'error': 'Database connection error'}), 500
        
    except Exception as e:
        logger.error(f"Error in login: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user by clearing session"""
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/auth/status', methods=['GET', 'OPTIONS'])
def auth_status():
    """Check if user is currently authenticated"""
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    try:
        user = get_current_user()
        if user:
            # Get fresh user data from database
            user_data = db.users.find_one({'_id': ObjectId(user['user_id'])})
            if not user_data or not user_data.get('is_active', True):
                # Clear session if user no longer exists or is inactive
                session.clear()
                response = jsonify({'authenticated': False}), 200
            else:
                response = jsonify({
                    'authenticated': True,
                    'user': {
                        'id': str(user_data['_id']),
                        'username': user_data['username'],
                        'email': user_data.get('email'),
                        'role': user_data['role'],
                        'email_verified': user_data.get('email_verified', False),
                        'created_at': user_data.get('created_at', datetime.now().isoformat())
                    }
                }), 200
        else:
            response = jsonify({'authenticated': False}), 200

        # Add CORS headers
        response[0].headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        logger.error(f"Error in auth_status: {str(e)}", exc_info=True)
        response = jsonify({'error': 'Internal server error'}), 500
        response[0].headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/api/designs/wall-designs', methods=['GET'])
@require_auth
def get_wall_designs():
    """Get wall designs for current user"""
    try:
        user_id = request.user_data['user_id']
        
        # Get the most recent wall design for the user
        wall_design = db.wall_designs.find_one(
            {'user_id': user_id},
            sort=[('created_at', -1)]
        )
        
        if wall_design:
            return jsonify({
                'wallDesigns': wall_design.get('wall_designs', {}),
                'roomType': wall_design.get('room_type', ''),
                'roomDimensions': wall_design.get('room_dimensions', {}),
                'selectedWall': wall_design.get('selected_wall', '')
            })
        else:
            return jsonify({
                'wallDesigns': {
                    'front': {'elements': [], 'wallpaper': None},
                    'back': {'elements': [], 'wallpaper': None},
                    'left': {'elements': [], 'wallpaper': None},
                    'right': {'elements': [], 'wallpaper': None}
                },
                'roomType': '',
                'roomDimensions': {'length': 8, 'width': 8, 'height': 4},
                'selectedWall': ''
            })
    except Exception as e:
        logger.info(f"Error getting wall designs: {e}")
        return jsonify({'error': 'Failed to get wall designs'}), 500

@app.route('/api/designs/wall-designs', methods=['POST'])
@require_auth
def save_wall_designs():
    """Save wall designs for current user"""
    try:
        user_id = request.user_data['user_id']
        data = request.get_json()
        
        # Optimize wall designs data before saving
        wall_designs = data.get('wallDesigns', {})
        optimized_designs = {}
        
        for wall_name, wall_data in wall_designs.items():
            if wall_data and (wall_data.get('elements') or wall_data.get('wallpaper')):
                # Only save walls that have actual content
                optimized_designs[wall_name] = {
                    'elements': wall_data.get('elements', []),
                    'wallpaper': wall_data.get('wallpaper')
                }
        
        wall_design_data = {
            'user_id': user_id,
            'wall_designs': optimized_designs,
            'room_type': data.get('roomType', ''),
            'room_dimensions': data.get('roomDimensions', {}),
            'selected_wall': data.get('selectedWall', ''),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        # Insert new wall design record
        result = db.wall_designs.insert_one(wall_design_data)
        
        return jsonify({
            'success': True,
            'message': 'Wall designs saved successfully'
        })
    except Exception as e:
        logger.info(f"Error saving wall designs: {e}")
        return jsonify({'error': 'Failed to save wall designs'}), 500

@app.route('/api/sessions', methods=['GET'])
@require_auth
def get_sessions():
    """Get all sessions for the authenticated user"""
    try:
        user_id = request.user_data['user_id']
        sessions = list(db.sessions.find({'user_id': user_id}))
        
        # Convert ObjectId to string
        for session in sessions:
            session['_id'] = str(session['_id'])
        
        return jsonify({'sessions': sessions}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions', methods=['POST'])
@require_auth
def save_session():
    """Save a new session"""
    try:
        user_id = request.user_data['user_id']
        data = request.get_json()
        
        session_data = {
            'user_id': user_id,
            'session_name': data.get('session_name'),
            'room_type': data.get('room_type'),
            'room_dimensions': data.get('room_dimensions'),
            'wall_designs': data.get('wall_designs'),
            'selected_wall': data.get('selected_wall'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = db.sessions.insert_one(session_data)
        session_data['_id'] = str(result.inserted_id)
        
        return jsonify({
            'message': 'Session saved successfully',
            'session': session_data
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['GET'])
@require_auth
def get_session(session_id):
    """Get a specific session"""
    try:
        user_id = request.user_data['user_id']
        
        # Validate ObjectId
        if not ObjectId.is_valid(session_id):
            return jsonify({'error': 'Invalid session ID'}), 400
        
        session_data = db.sessions.find_one({
            '_id': ObjectId(session_id),
            'user_id': user_id
        })
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 404
        
        session_data['_id'] = str(session_data['_id'])
        return jsonify({'session': session_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['PUT'])
@require_auth
def update_session(session_id):
    """Update a session"""
    try:
        user_id = request.user_data['user_id']
        data = request.get_json()
        
        # Validate ObjectId
        if not ObjectId.is_valid(session_id):
            return jsonify({'error': 'Invalid session ID'}), 400
        
        update_data = {
            'session_name': data.get('session_name'),
            'room_type': data.get('room_type'),
            'room_dimensions': data.get('room_dimensions'),
            'wall_designs': data.get('wall_designs'),
            'selected_wall': data.get('selected_wall'),
            'updated_at': datetime.utcnow()
        }
        
        result = db.sessions.update_one(
            {'_id': ObjectId(session_id), 'user_id': user_id},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Session not found'}), 404
            
        return jsonify({'message': 'Session updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email with a new 15-minute valid token"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Find user by email
        user = db.users.find_one({'email': email})
        
        if not user:
            return jsonify({'error': 'No account found with this email'}), 404
            
        if user.get('email_verified', False):
            return jsonify({'message': 'Email is already verified'}), 200
            
        # Generate new verification token (valid for 15 minutes)
        verification_token = generate_verification_token(email)
        
        # Update user with new token
        db.users.update_one(
            {'_id': user['_id']},
            {'$set': {
                'verification_token': verification_token,
                'verification_sent_at': datetime.utcnow()  # Track when verification was sent
            }}
        )
        
        # Send verification email with 15-minute expiration notice
        try:
            verification_sent = send_verification_email(email, verification_token)
            if not verification_sent:
                # If email fails to send, delete the user and return error
                return jsonify({
                    'error': 'Failed to send verification email. Please try again.'
                }), 500
                
            return jsonify({
                'message': 'A new verification link has been sent to your email. It will expire in 15 minutes.'
            }), 200
            
        except Exception as e:
            logger.error(f"Failed to resend verification email: {str(e)}")
            return jsonify({
                'error': 'Failed to send verification email. Please try again.'
            }), 500
            
    except Exception as e:
        logger.error(f"Error in resend_verification: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
@require_auth
def delete_session(session_id):
    """Delete a session"""
    try:
        user_id = request.user_data['user_id']
        
        # Verify the session belongs to the user
        session_data = db.sessions.find_one({
            '_id': ObjectId(session_id),
            'user_id': user_id
        })
        
        if not session_data:
            return jsonify({'error': 'Session not found'}), 404
        
        # Delete the session
        db.sessions.delete_one({'_id': ObjectId(session_id)})
        
        return jsonify({'message': 'Session deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Frontend serving routes
@app.route('/')
def serve_home():
    """Serve the React app home page"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the React build or fallback to index.html"""
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    """Handle React Router routes by serving index.html"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    """
    Get all feedback entries (both approved and unapproved)
    No authentication required as this is a public endpoint
    """
    try:
        # Changed: Removed the 'approved' filter to show all feedback
        feedback = list(db.feedback.find({}, {'_id': 0, 'email': 0}).sort('date', -1))
        return jsonify({
            'success': True,
            'data': feedback
        }), 200
    except Exception as e:
        logger.info(f"Error fetching feedback: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch feedback'
        }), 500

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """
    Submit new feedback
    No authentication required as this is a public endpoint
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'message', 'rating']
        if not all(field in data for field in required_fields):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
            
        # Validate rating is between 1-5
        if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({
                'success': False,
                'error': 'Rating must be between 1 and 5'
            }), 400
            
        # Create feedback document
        feedback = {
            'name': data['name'],
            'email': data['email'],
            'message': data['message'],
            'rating': data['rating'],
            'date': datetime.utcnow().isoformat(),
            'approved': False  # Admin can approve feedback before showing publicly
        }
        
        # Insert into database
        result = db.feedback.insert_one(feedback)
        feedback['id'] = str(result.inserted_id)
        
        # Don't return email in the response for privacy
        del feedback['email']
        del feedback['_id']
        
        return jsonify({
            'success': True,
            'data': feedback
        }), 201
        
    except Exception as e:
        logger.info(f"Error submitting feedback: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to submit feedback'
        }), 500

if __name__ == '__main__':
    # Create indexes for feedback collection
    db.feedback.create_index('date')
    db.feedback.create_index('rating')
    db.feedback.create_index('approved')
    
    app.run(debug=debug, host='0.0.0.0', port=port)