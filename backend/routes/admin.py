from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from bson import ObjectId
from dotenv import load_dotenv
from configs.database import db
from utils.auth_utils import require_auth, require_admin

load_dotenv()

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@require_auth
@require_admin
def get_all_users():
    """Get all users (admin only)"""
    try:
        users = list(db.users.find({}, {'password': 0}))
        
        # Convert ObjectId to string
        for user in users:
            user['_id'] = str(user['_id'])
        
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@require_auth
@require_admin
def create_admin_user():
    """Create a new admin user (admin only)"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        if not username or not password or not email:
            return jsonify({'error': 'Username, password, and email are required'}), 400
        
        # Check if user already exists
        existing_user = db.users.find_one({'$or': [{'email': email}, {'username': username}]})
        if existing_user:
            return jsonify({'error': 'User with this email or username already exists'}), 409
        
        # Create new admin user
        user_data = {
            'username': username,
            'email': email,
            'password': generate_password_hash(password),
            'role': 'admin',
            'created_at': datetime.utcnow(),
            'last_login': None,
            'created_by': request.user_data['user_id']
        }
        
        result = db.users.insert_one(user_data)
        user_data['_id'] = str(result.inserted_id)
        del user_data['password']
        
        return jsonify({
            'message': 'Admin user created successfully',
            'user': user_data
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete_user(user_id):
    """Delete a user (admin only)"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400
        
        # Don't allow admin to delete themselves
        if user_id == request.user_data['user_id']:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        result = db.users.delete_one({'_id': ObjectId(user_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        # Also delete all sessions for this user
        db.sessions.delete_many({'user_id': user_id})
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>/promote', methods=['PUT'])
@require_auth
@require_admin
def promote_user_to_admin(user_id):
    """Promote a user to admin role (admin only)"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400
        
        # Don't allow admin to promote themselves (they're already admin)
        if user_id == request.user_data['user_id']:
            return jsonify({'error': 'You are already an admin'}), 400
        
        # Update user role to admin
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'role': 'admin', 'updated_at': datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        if result.modified_count == 0:
            return jsonify({'error': 'User is already an admin'}), 400
        
        return jsonify({'message': 'User promoted to admin successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<user_id>/demote', methods=['PUT'])
@require_auth
@require_admin
def demote_admin_to_user(user_id):
    """Demote an admin to regular user role (admin only)"""
    try:
        print(f"[DEBUG] Demote request for user_id: {user_id}, type: {type(user_id)}")
        print(f"[DEBUG] Request data: {request.data}")
        print(f"[DEBUG] Request headers: {dict(request.headers)}")
        print(f"[DEBUG] Current user: {request.user_data}")
        
        # Validate ObjectId
        if not ObjectId.is_valid(user_id):
            print(f"[ERROR] Invalid ObjectId: {user_id}")
            return jsonify({'error': 'Invalid user ID'}), 400
        
        # Don't allow admin to demote themselves
        current_user_id = request.user_data.get('user_id')
        print(f"[DEBUG] Current user ID: {current_user_id}, Target user ID: {user_id}")
        if user_id == current_user_id:
            print("[ERROR] User attempted to demote themselves")
            return jsonify({'error': 'You cannot demote yourself'}), 400
        
        # Update user role to user
        result = db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'role': 'user', 'updated_at': datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        if result.modified_count == 0:
            return jsonify({'error': 'User is already a regular user'}), 400
        
        return jsonify({'message': 'Admin demoted to regular user successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/stats', methods=['GET'])
@require_auth
@require_admin
def get_admin_stats():
    """Get admin statistics"""
    try:
        total_users = db.users.count_documents({})
        total_sessions = db.sessions.count_documents({})
        admin_users = db.users.count_documents({'role': 'admin'})
        regular_users = db.users.count_documents({'role': 'user'})
        
        # Get recent activity
        recent_sessions = list(db.sessions.find().sort('created_at', -1).limit(10))
        for session in recent_sessions:
            session['_id'] = str(session['_id'])
        
        stats = {
            'total_users': total_users,
            'total_sessions': total_sessions,
            'admin_users': admin_users,
            'regular_users': regular_users,
            'recent_sessions': recent_sessions
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500