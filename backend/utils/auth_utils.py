from functools import wraps
from flask import request, jsonify, session

# Session Configuration
SESSION_EXPIRATION = 24 * 60 * 60  # 24 hours


def get_current_user():
    if session.get('logged_in'):
        return {
            'user_id': session.get('user_id'),
            'username': session.get('username'),
            'role': session.get('role')
        }
    return None

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_data = get_current_user()
        if not user_data:
            return jsonify({'error': 'Authentication required'}), 401
        request.user_data = user_data
        return f(*args, **kwargs)
    return decorated_function

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, 'user_data'):
            return jsonify({'error': 'Authentication required'}), 401
        if request.user_data.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function
