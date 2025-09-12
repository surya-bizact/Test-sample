# AltarMaker

AltarMaker is a creative web application that lets you design and personalize your own altar in a Mexican-style theme. Whether you want to create a digital altar for cultural, spiritual, or personal expression, AltarMaker provides an easy-to-use drag-and-drop interface with customizable elements like candles, frames, flowers, stickers, and text boxes.

# AltarMaker Backend API

A Flask-based REST API for the AltarMaker application, providing authentication, session management, and admin functionality with MongoDB Atlas integration.

## 🚀 Features

- **JWT Authentication**: Secure user authentication with role-based access
- **Session Management**: Save and load room design sessions
- **Admin Panel**: User management and system statistics
- **MongoDB Atlas**: Cloud database integration
- **CORS Support**: Cross-origin resource sharing enabled
- **Data Validation**: Comprehensive input validation
- **Error Handling**: Standardized error responses

## 📋 Prerequisites

- Python 3.8+
- MongoDB Atlas account
- pip (Python package manager)

## 🛠️ Installation

1. **Clone the repository** (if not already done):
```bash
cd backend
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```


```

4. **Initialize the database**:
```bash
python -c "from database import init_database; init_database()"
```

## 🚀 Running the Application

### Development Mode
```bash
python app.py
```

### Production Mode
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

The API will be available at `http://localhost:5000`

## 🔐 Admin Management

### Create Initial Admin User
```bash
python create_admin.py
```

### List Admin Users
```bash
python create_admin.py list
```

### Admin User Creation Flow
1. Run `python create_admin.py` to create the first admin
2. Use admin credentials to login via frontend
3. Additional admins can be created through the admin panel

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user (users only, not admins).

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password",
  "email": "john@example.com",
  "role": "user"
}
```

**Note:** Admin registration is not allowed through the public API. Admin users must be created by existing administrators.

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "user",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### POST `/api/auth/login`
Login user.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password",
  "role": "user"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "user",
    "last_login": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Session Management Endpoints

#### GET `/api/sessions`
Get all sessions for the authenticated user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "sessions": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "session_name": "Living Room Design",
      "room_type": "livingroom",
      "room_dimensions": {
        "length": 12,
        "width": 10,
        "height": 8
      },
      "wall_designs": {
        "front": {"elements": [], "wallpaper": null},
        "back": {"elements": [], "wallpaper": null},
        "left": {"elements": [], "wallpaper": null},
        "right": {"elements": [], "wallpaper": null}
      },
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/sessions`
Save a new session.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "session_name": "My Living Room",
  "room_type": "livingroom",
  "room_dimensions": {
    "length": 12,
    "width": 10,
    "height": 8
  },
  "wall_designs": {
    "front": {"elements": [], "wallpaper": null},
    "back": {"elements": [], "wallpaper": null},
    "left": {"elements": [], "wallpaper": null},
    "right": {"elements": [], "wallpaper": null}
  },
  "selected_wall": "front"
}
```

#### PUT `/api/sessions/<session_id>`
Update an existing session.

#### DELETE `/api/sessions/<session_id>`
Delete a session.

### Admin Endpoints

#### GET `/api/admin/users`
Get all users (admin only).

#### POST `/api/admin/users`
Create a new admin user (admin only).

**Request Body:**
```json
{
  "username": "new_admin",
  "password": "secure_password",
  "email": "admin@example.com"
}
```

#### DELETE `/api/admin/users/<user_id>`
Delete a user (admin only).

#### GET `/api/admin/stats`
Get system statistics (admin only).

**Response:**
```json
{
  "total_users": 25,
  "total_sessions": 150,
  "admin_users": 3,
  "regular_users": 22,
  "recent_sessions": [...]
}
```

## 🔐 Authentication

The API uses Flask sessions for authentication. Sessions are automatically handled by the browser and expire after 24 hours.

```
# Frontend requests should include credentials
credentials: 'include'
```

### Session Structure
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "username": "john_doe",
  "role": "user",
  "logged_in": true
}
```

## 🗄️ Database Schema

### Users Collection
```json
{
  "_id": ObjectId,
  "username": "string",
  "password": "hashed_string",
  "role": "user|admin",
  "created_at": "datetime",
  "last_login": "datetime"
}
```

### Sessions Collection
```json
{
  "_id": ObjectId,
  "user_id": "string",
  "session_name": "string",
  "room_type": "livingroom|bedroom|kitchen|others",
  "room_dimensions": {
    "length": "number",
    "width": "number",
    "height": "number"
  },
  "wall_designs": {
    "front": {"elements": [], "wallpaper": null},
    "back": {"elements": [], "wallpaper": null},
    "left": {"elements": [], "wallpaper": null},
    "right": {"elements": [], "wallpaper": null}
  },
  "selected_wall": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## 🛡️ Security Features

- **Password Hashing**: Bcrypt password hashing
- **Session-based Authentication**: Secure Flask sessions
- **Role-based Access**: User and admin roles
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Cross-origin request handling
- **Error Handling**: Secure error responses

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb://localhost:27017/altarmaker` |
| `SECRET_KEY` | Flask session secret | `your-secret-key-change-this` |
| `SECRET_KEY` | Flask secret key | `your-secret-key-change-this` |


### Database Indexes

The application automatically creates the following indexes:

- `users.username` (unique)
- `users.role`
- `users.created_at`
- `sessions.user_id`
- `sessions.created_at`
- `sessions.user_id + created_at` (compound)

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Test Authentication
```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123", "role": "user"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123", "role": "user"}'
```

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

### Environment Setup
1. Set up MongoDB Atlas cluster
2. Configure environment variables
3. Run database initialization
4. Deploy with gunicorn or similar WSGI server

## 📝 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

## Frontend-Setup

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.


## How to use

## ✨ Features

* 🎨 **Customizable Canvas** – Drag, drop, resize, and arrange altar elements.
* 🕯️ **Mexican-Style Decorations** – Add candles, marigolds, frames, garlands, and more.
* 🖼️ **Personalized Frames** – Upload your own images or choose from presets.
* 📝 **Text Support** – Add names, quotes, or personal messages.
* 📱 **Responsive Design** – Works on desktops, tablets, and mobiles.
* 💾 **Save & Load Designs** – Store your altar design and continue later.
* 📤 **Share with Others** – Export and share your altar digitally.


## 🚀 Getting Started

### 1. Open the Application

* Visit the AltarMaker website (or open the app if installed).

### 2. Choose Elements

* Select from frames, candles, flowers, garlands, stickers, or text.

### 3. Drag & Resize

* Move items around your altar and resize them as you like.

### 4. Add Personal Touches

* Upload images, type in names or quotes, and make it truly yours.

### 5. Save or Share

* Save your altar to revisit later or share it with friends and family.


## 📋 Usage Tips

* Use **frames** for photos of loved ones.
* Add **candles and marigolds** for a traditional touch.
* Use the **text tool** to include meaningful messages.
* Combine stickers and flowers for creative decoration.
* Save your design before closing the app so you don’t lose progress.

## ❓ FAQ

**Q: Do I need to sign up to use AltarMaker?**
A: Yes, an account is required if you want to save designs online.

**Q: Can I upload my own pictures?**
A: Yes! You can upload images to frames and personalize your altar.

**Q: Is my data private?**
A: Yes, your designs are stored securely, and personal images are only accessible to you.

## 🌸 About

AltarMaker is designed to bring creativity, tradition, and personalization together in one platform. It celebrates culture while giving users the freedom to express themselves digitally.

👉 Start creating your altar today and let your imagination shine!
