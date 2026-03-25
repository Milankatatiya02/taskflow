"""
TaskFlow - FastAPI Backend Server with MongoDB storage.
Production-ready with auth enhancements, dashboard analytics, notifications,
projects, labels, task templates, bulk actions, and file uploads.
"""

import asyncio
import os
import secrets
import smtplib
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Load .env from the project root (one level up from server/)
_env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(_env_path)

import bcrypt as _bcrypt
import certifi
from bson import ObjectId
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

app = FastAPI(title='TaskFlow API')

FRONTEND_ORIGINS = os.getenv(
    'FRONTEND_ORIGINS',
    'http://localhost:5173,http://localhost:5174,http://localhost:3000',
)
ALLOWED_ORIGINS = [origin.strip() for origin in FRONTEND_ORIGINS.split(',') if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://127.0.0.1:27017')
MONGODB_DB = os.getenv('MONGODB_DB', 'taskflow')
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '60'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_EXPIRE_DAYS', '7'))
SMTP_HOST = os.getenv('SMTP_HOST', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', SMTP_USERNAME or 'noreply@taskflow.local')
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
REMINDER_INTERVAL_SECONDS = int(os.getenv('REMINDER_INTERVAL_SECONDS', '60'))
REMINDER_MINUTES_BEFORE = int(os.getenv('REMINDER_MINUTES_BEFORE', '60'))
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

UPLOAD_DIR = Path(__file__).parent / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip'}

mongo_client: Optional[AsyncIOMotorClient] = None
db = None
reminder_loop_task: Optional[asyncio.Task] = None

# ---------- Rate Limiting ----------
rate_limit_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 10  # per window


def check_rate_limit(key: str) -> None:
    now = time.time()
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limit_store[key]) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail='Too many requests. Please try again later.')
    rate_limit_store[key].append(now)


# ---------- Helpers ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_access_token(user_id: str) -> str:
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': user_id,
        'type': 'access',
        'exp': datetime.now(timezone.utc) + expires_delta,
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        'sub': user_id,
        'type': 'refresh',
        'exp': datetime.now(timezone.utc) + expires_delta,
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')


def to_public_user(user_doc: dict) -> dict:
    return {
        'id': str(user_doc['_id']),
        'name': user_doc.get('name', ''),
        'email': user_doc.get('email', ''),
        'phone': user_doc.get('phone', ''),
        'bio': user_doc.get('bio', ''),
        'avatar': user_doc.get('avatar', ''),
        'createdAt': user_doc.get('createdAt', ''),
    }


def to_public_task(task_doc: dict) -> dict:
    return {
        'id': str(task_doc['_id']),
        'userId': str(task_doc['userId']),
        'title': task_doc['title'],
        'description': task_doc['description'],
        'status': task_doc['status'],
        'priority': task_doc['priority'],
        'category': task_doc.get('category', 'General'),
        'dueDate': task_doc.get('dueDate'),
        'recurrence': task_doc.get('recurrence', 'None'),
        'subtasks': task_doc.get('subtasks', []),
        'attachmentLinks': task_doc.get('attachmentLinks', []),
        'attachments': task_doc.get('attachments', []),
        'assignee': task_doc.get('assignee', ''),
        'collaborators': task_doc.get('collaborators', []),
        'comments': task_doc.get('comments', []),
        'estimatedMinutes': task_doc.get('estimatedMinutes', 0),
        'spentMinutes': task_doc.get('spentMinutes', 0),
        'projectId': str(task_doc['projectId']) if task_doc.get('projectId') else None,
        'labels': [str(lid) for lid in task_doc.get('labels', [])],
        'dependencies': [str(did) for did in task_doc.get('dependencies', [])],
        'createdAt': task_doc['createdAt'],
        'updatedAt': task_doc['updatedAt'],
    }


def to_public_project(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'userId': str(doc['userId']),
        'name': doc['name'],
        'description': doc.get('description', ''),
        'color': doc.get('color', '#6C63FF'),
        'icon': doc.get('icon', 'folder'),
        'members': doc.get('members', []),
        'createdAt': doc.get('createdAt', ''),
        'updatedAt': doc.get('updatedAt', ''),
    }


def to_public_label(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'userId': str(doc['userId']),
        'name': doc['name'],
        'color': doc.get('color', '#6C63FF'),
    }


def to_public_notification(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'type': doc.get('type', 'info'),
        'title': doc.get('title', ''),
        'message': doc.get('message', ''),
        'read': doc.get('read', False),
        'createdAt': doc.get('createdAt', ''),
    }


def to_public_template(doc: dict) -> dict:
    return {
        'id': str(doc['_id']),
        'userId': str(doc['userId']),
        'name': doc['name'],
        'title': doc.get('title', ''),
        'description': doc.get('description', ''),
        'priority': doc.get('priority', 'Medium'),
        'category': doc.get('category', 'General'),
        'subtasks': doc.get('subtasks', []),
        'estimatedMinutes': doc.get('estimatedMinutes', 0),
        'createdAt': doc.get('createdAt', ''),
    }


async def log_activity(user_id: str, action: str, message: str, task_id: Optional[str] = None) -> None:
    await db.activities.insert_one(
        {
            'userId': ObjectId(user_id),
            'taskId': ObjectId(task_id) if task_id and ObjectId.is_valid(task_id) else None,
            'action': action,
            'message': message,
            'createdAt': now_iso(),
        }
    )


async def create_notification(user_id: str, ntype: str, title: str, message: str) -> None:
    await db.notifications.insert_one({
        'userId': ObjectId(user_id),
        'type': ntype,
        'title': title,
        'message': message,
        'read': False,
        'createdAt': now_iso(),
    })


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    normalized = value.replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD)


def send_email_sync(to_email: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM_EMAIL
    msg['To'] = to_email
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(msg)


async def run_reminder_checks() -> None:
    if not is_smtp_configured() or db is None:
        return

    now = datetime.now(timezone.utc)
    reminder_window_end = now + timedelta(minutes=REMINDER_MINUTES_BEFORE)
    cursor = db.tasks.find({'status': {'$ne': 'Completed'}, 'dueDate': {'$ne': None}})

    async for task in cursor:
        due_dt = parse_iso_datetime(task.get('dueDate'))
        if not due_dt:
            continue

        reminder_marker = task.get('reminderSentForDueDate')
        if reminder_marker == task.get('dueDate'):
            continue

        if due_dt < now or due_dt > reminder_window_end:
            continue

        user_doc = await db.users.find_one({'_id': task['userId']})
        if not user_doc or not user_doc.get('email'):
            continue

        task_title = task.get('title', 'Task')
        due_human = due_dt.strftime('%Y-%m-%d %H:%M UTC')
        body = f'Reminder: "{task_title}" is due at {due_human}.'

        try:
            await asyncio.to_thread(send_email_sync, user_doc['email'], 'TaskFlow Reminder', body)
            await db.tasks.update_one(
                {'_id': task['_id']},
                {'$set': {'reminderSentForDueDate': task.get('dueDate'), 'reminderLastSentAt': now_iso()}},
            )
            await log_activity(str(task['userId']), 'reminder_sent', f'Reminder sent for "{task_title}"', str(task['_id']))
            await create_notification(str(task['userId']), 'reminder', 'Task Reminder', f'"{task_title}" is due at {due_human}')
        except Exception:
            continue


async def reminder_worker() -> None:
    while True:
        try:
            await run_reminder_checks()
        except Exception:
            pass
        await asyncio.sleep(max(30, REMINDER_INTERVAL_SECONDS))


async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing authorization header')

    try:
        scheme, token = authorization.split(' ')
    except ValueError as exc:
        raise HTTPException(status_code=401, detail='Invalid authorization header') from exc

    if scheme.lower() != 'bearer':
        raise HTTPException(status_code=401, detail='Invalid authentication scheme')

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
    except JWTError as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired token') from exc

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail='Invalid token payload')

    return user_id


# ---------- Pydantic Models ----------

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5)


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str = Field(..., min_length=6)


class RefreshTokenRequest(BaseModel):
    refreshToken: str


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    status: str = Field(default='Pending')
    priority: str = Field(default='Medium')
    category: Optional[str] = Field(default='General', max_length=60)
    dueDate: Optional[str] = None
    recurrence: Optional[str] = Field(default='None')
    subtasks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    attachmentLinks: Optional[List[str]] = Field(default_factory=list)
    attachments: Optional[List[str]] = Field(default_factory=list)
    assignee: Optional[str] = ''
    collaborators: Optional[List[str]] = Field(default_factory=list)
    estimatedMinutes: Optional[int] = 0
    projectId: Optional[str] = None
    labels: Optional[List[str]] = Field(default_factory=list)
    dependencies: Optional[List[str]] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    dueDate: Optional[str] = None
    recurrence: Optional[str] = None
    subtasks: Optional[List[Dict[str, Any]]] = None
    attachmentLinks: Optional[List[str]] = None
    attachments: Optional[List[str]] = None
    assignee: Optional[str] = None
    collaborators: Optional[List[str]] = None
    comments: Optional[List[Dict[str, Any]]] = None
    estimatedMinutes: Optional[int] = None
    spentMinutes: Optional[int] = None
    projectId: Optional[str] = None
    labels: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None


class BulkActionRequest(BaseModel):
    taskIds: List[str]
    action: str  # 'delete' | 'status_change'
    status: Optional[str] = None


class PreferencesModel(BaseModel):
    emailNotifications: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    taskReminders: Optional[bool] = None
    weeklyReport: Optional[bool] = None
    twoFactor: Optional[bool] = None


class ContactMessage(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5)
    subject: str = Field(..., min_length=2, max_length=150)
    message: str = Field(..., min_length=5, max_length=2000)


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default='', max_length=500)
    color: str = Field(default='#6C63FF')
    icon: str = Field(default='folder')


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ProjectInvite(BaseModel):
    email: str = Field(..., min_length=5)


class LabelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=30)
    color: str = Field(default='#6C63FF')


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    title: str = Field(default='')
    description: str = Field(default='')
    priority: str = Field(default='Medium')
    category: str = Field(default='General')
    subtasks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    estimatedMinutes: Optional[int] = 0


DEFAULT_PREFS = {
    'emailNotifications': True,
    'pushNotifications': True,
    'taskReminders': True,
    'weeklyReport': True,
    'twoFactor': False,
}


# ---------- App Lifecycle ----------

@app.on_event('startup')
async def startup_db_client() -> None:
    global mongo_client, db, reminder_loop_task
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    db = mongo_client[MONGODB_DB]

    await db.users.create_index('email', unique=True)
    await db.tasks.create_index([('userId', 1), ('createdAt', -1)])
    await db.tasks.create_index([('status', 1), ('dueDate', 1)])
    await db.tasks.create_index([('projectId', 1)])
    await db.preferences.create_index('userId', unique=True)
    await db.activities.create_index([('userId', 1), ('createdAt', -1)])
    await db.notifications.create_index([('userId', 1), ('createdAt', -1)])
    await db.notifications.create_index([('userId', 1), ('read', 1)])
    await db.projects.create_index([('userId', 1), ('createdAt', -1)])
    await db.labels.create_index([('userId', 1)])
    await db.task_templates.create_index([('userId', 1)])
    await db.password_reset_tokens.create_index('token', unique=True)
    await db.password_reset_tokens.create_index('expiresAt', expireAfterSeconds=0)
    reminder_loop_task = asyncio.create_task(reminder_worker())


@app.on_event('shutdown')
async def shutdown_db_client() -> None:
    global reminder_loop_task
    if reminder_loop_task is not None:
        reminder_loop_task.cancel()
        reminder_loop_task = None
    if mongo_client is not None:
        mongo_client.close()


# ==================== AUTH ====================

@app.post('/api/auth/register')
async def register(user: UserRegister, request: Request):
    check_rate_limit(f'auth:{request.client.host}')
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    user_doc = {
        'name': user.name,
        'email': user.email,
        'password': get_password_hash(user.password),
        'phone': '',
        'bio': '',
        'avatar': '',
        'createdAt': now_iso(),
    }
    result = await db.users.insert_one(user_doc)

    await db.preferences.update_one(
        {'userId': result.inserted_id},
        {'$setOnInsert': {**DEFAULT_PREFS, 'userId': result.inserted_id}},
        upsert=True,
    )

    user_id = str(result.inserted_id)
    await create_notification(user_id, 'welcome', 'Welcome to TaskFlow!', 'Your account has been created. Start by creating your first task.')

    return {
        'message': 'Registration successful',
        'token': create_access_token(user_id),
        'refreshToken': create_refresh_token(user_id),
        'user': {'id': user_id, 'name': user.name, 'email': user.email},
    }


@app.post('/api/auth/login')
async def login(user: UserLogin, request: Request):
    check_rate_limit(f'auth:{request.client.host}')
    existing_user = await db.users.find_one({'email': user.email})
    if not existing_user:
        raise HTTPException(status_code=401, detail='Invalid email or password')

    stored_password = existing_user.get('password', '')
    is_valid_password = False

    if stored_password.startswith('$2'):
        is_valid_password = verify_password(user.password, stored_password)
    elif stored_password == user.password:
        is_valid_password = True
        await db.users.update_one(
            {'_id': existing_user['_id']},
            {'$set': {'password': get_password_hash(user.password), 'updatedAt': now_iso()}},
        )

    if not is_valid_password:
        raise HTTPException(status_code=401, detail='Invalid email or password')

    await db.preferences.update_one(
        {'userId': existing_user['_id']},
        {'$setOnInsert': {**DEFAULT_PREFS, 'userId': existing_user['_id']}},
        upsert=True,
    )

    user_id = str(existing_user['_id'])
    return {
        'message': 'Login successful',
        'token': create_access_token(user_id),
        'refreshToken': create_refresh_token(user_id),
        'user': {
            'id': user_id,
            'name': existing_user['name'],
            'email': existing_user['email'],
            'phone': existing_user.get('phone', ''),
            'bio': existing_user.get('bio', ''),
        },
    }


@app.post('/api/auth/refresh')
async def refresh_token(body: RefreshTokenRequest):
    try:
        payload = jwt.decode(body.refreshToken, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('type') != 'refresh':
            raise HTTPException(status_code=401, detail='Invalid token type')
        user_id = payload.get('sub')
    except JWTError as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired refresh token') from exc

    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail='Invalid token payload')

    user_doc = await db.users.find_one({'_id': ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=401, detail='User not found')

    return {
        'token': create_access_token(user_id),
        'refreshToken': create_refresh_token(user_id),
    }


@app.post('/api/auth/forgot-password')
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    check_rate_limit(f'forgot:{request.client.host}')
    user_doc = await db.users.find_one({'email': body.email})
    # Always return success to prevent email enumeration
    if not user_doc:
        return {'message': 'If an account exists with this email, a reset link has been sent.'}

    token = secrets.token_urlsafe(48)
    await db.password_reset_tokens.insert_one({
        'token': token,
        'userId': user_doc['_id'],
        'expiresAt': datetime.now(timezone.utc) + timedelta(hours=1),
        'createdAt': now_iso(),
    })

    reset_link = f'{FRONTEND_URL}/reset-password?token={token}'
    body_text = f'Click the following link to reset your TaskFlow password:\n\n{reset_link}\n\nThis link expires in 1 hour.'

    if is_smtp_configured():
        try:
            await asyncio.to_thread(send_email_sync, body.email, 'TaskFlow Password Reset', body_text)
        except Exception:
            pass

    return {'message': 'If an account exists with this email, a reset link has been sent.', 'resetToken': token}


@app.post('/api/auth/reset-password')
async def reset_password(body: ResetPasswordRequest, request: Request):
    check_rate_limit(f'reset:{request.client.host}')
    token_doc = await db.password_reset_tokens.find_one({'token': body.token})
    if not token_doc:
        raise HTTPException(status_code=400, detail='Invalid or expired reset token')

    if token_doc['expiresAt'].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        await db.password_reset_tokens.delete_one({'_id': token_doc['_id']})
        raise HTTPException(status_code=400, detail='Reset token has expired')

    await db.users.update_one(
        {'_id': token_doc['userId']},
        {'$set': {'password': get_password_hash(body.newPassword), 'updatedAt': now_iso()}},
    )
    await db.password_reset_tokens.delete_many({'userId': token_doc['userId']})

    return {'message': 'Password has been reset successfully'}


# ==================== USER ====================

@app.get('/api/user/profile')
async def get_profile(current_user: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({'_id': ObjectId(current_user)})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')
    return to_public_user(user_doc)


@app.put('/api/user/profile')
async def update_profile(profile: UserProfile, current_user: str = Depends(get_current_user)):
    update_doc = {}
    if profile.name is not None:
        update_doc['name'] = profile.name
    if profile.email is not None:
        duplicate = await db.users.find_one(
            {'email': profile.email, '_id': {'$ne': ObjectId(current_user)}}
        )
        if duplicate:
            raise HTTPException(status_code=400, detail='Email already in use')
        update_doc['email'] = profile.email
    if profile.phone is not None:
        update_doc['phone'] = profile.phone
    if profile.bio is not None:
        update_doc['bio'] = profile.bio

    if update_doc:
        update_doc['updatedAt'] = now_iso()
        await db.users.update_one({'_id': ObjectId(current_user)}, {'$set': update_doc})

    user_doc = await db.users.find_one({'_id': ObjectId(current_user)})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')
    return to_public_user(user_doc)


@app.put('/api/user/password')
async def change_password(pwd_change: PasswordChange, current_user: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({'_id': ObjectId(current_user)})
    if not user_doc:
        raise HTTPException(status_code=404, detail='User not found')

    stored_password = user_doc.get('password', '')
    password_matches = False
    if stored_password.startswith('$2'):
        password_matches = verify_password(pwd_change.currentPassword, stored_password)
    else:
        password_matches = stored_password == pwd_change.currentPassword

    if not password_matches:
        raise HTTPException(status_code=401, detail='Current password is incorrect')

    await db.users.update_one(
        {'_id': ObjectId(current_user)},
        {'$set': {'password': get_password_hash(pwd_change.newPassword), 'updatedAt': now_iso()}},
    )
    return {'message': 'Password changed successfully'}


@app.delete('/api/user/account')
async def delete_account(current_user: str = Depends(get_current_user)):
    uid = ObjectId(current_user)
    await db.tasks.delete_many({'userId': uid})
    await db.activities.delete_many({'userId': uid})
    await db.notifications.delete_many({'userId': uid})
    await db.preferences.delete_many({'userId': uid})
    await db.projects.delete_many({'userId': uid})
    await db.labels.delete_many({'userId': uid})
    await db.task_templates.delete_many({'userId': uid})
    await db.users.delete_one({'_id': uid})
    return {'message': 'Account and all associated data deleted successfully'}


@app.get('/api/user/preferences')
async def get_preferences(current_user: str = Depends(get_current_user)):
    prefs = await db.preferences.find_one({'userId': ObjectId(current_user)})
    if not prefs:
        await db.preferences.insert_one({**DEFAULT_PREFS, 'userId': ObjectId(current_user)})
        return DEFAULT_PREFS

    return {
        'emailNotifications': prefs.get('emailNotifications', True),
        'pushNotifications': prefs.get('pushNotifications', True),
        'taskReminders': prefs.get('taskReminders', True),
        'weeklyReport': prefs.get('weeklyReport', True),
        'twoFactor': prefs.get('twoFactor', False),
    }


@app.put('/api/user/preferences')
async def update_preferences(prefs: PreferencesModel, current_user: str = Depends(get_current_user)):
    current = await get_preferences(current_user)
    update = {
        'emailNotifications': prefs.emailNotifications if prefs.emailNotifications is not None else current['emailNotifications'],
        'pushNotifications': prefs.pushNotifications if prefs.pushNotifications is not None else current['pushNotifications'],
        'taskReminders': prefs.taskReminders if prefs.taskReminders is not None else current['taskReminders'],
        'weeklyReport': prefs.weeklyReport if prefs.weeklyReport is not None else current['weeklyReport'],
        'twoFactor': prefs.twoFactor if prefs.twoFactor is not None else current['twoFactor'],
    }

    await db.preferences.update_one(
        {'userId': ObjectId(current_user)},
        {'$set': {**update, 'userId': ObjectId(current_user), 'updatedAt': now_iso()}},
        upsert=True,
    )
    return update


# ==================== TASKS ====================

@app.get('/api/tasks')
async def get_all_tasks(current_user: str = Depends(get_current_user)):
    cursor = db.tasks.find({'userId': ObjectId(current_user)}).sort('createdAt', -1)
    tasks = [to_public_task(doc) async for doc in cursor]
    return tasks


@app.get('/api/tasks/stats')
async def get_task_stats(current_user: str = Depends(get_current_user)):
    cursor = db.tasks.find({'userId': ObjectId(current_user)})
    tasks = [to_public_task(doc) async for doc in cursor]

    return {
        'total': len(tasks),
        'completed': len([task for task in tasks if task['status'] == 'Completed']),
        'inProgress': len([task for task in tasks if task['status'] == 'In Progress']),
        'pending': len([task for task in tasks if task['status'] == 'Pending']),
    }


async def notify_task_users_creation(task_doc: dict, current_user_id: str) -> None:
    user_ids = set()

    assignee = task_doc.get('assignee')
    if assignee and assignee != current_user_id:
        user_ids.add(assignee)

    for collab in task_doc.get('collaborators', []):
        if collab and collab != current_user_id:
            user_ids.add(collab)

    project_id = task_doc.get('projectId')
    if project_id:
        project = await db.projects.find_one({'_id': project_id})
        if project:
            if str(project['userId']) != current_user_id:
                user_ids.add(str(project['userId']))
            for member in project.get('members', []):
                if member != current_user_id:
                    user_ids.add(member)

    title = task_doc.get('title', 'Task')
    for uid in user_ids:
        if not ObjectId.is_valid(uid):
            continue
        try:
            await create_notification(
                uid, 'task_assigned', 'New Task Activity',
                f'A new task "{title}" has been created in your workspace.'
            )
            if is_smtp_configured():
                user_doc = await db.users.find_one({'_id': ObjectId(uid)})
                if user_doc and user_doc.get('email'):
                    body = f'Hello {user_doc.get("name", "User")},\n\nA new task "{title}" has been created that involves you.\n\nTaskFlow'
                    await asyncio.to_thread(send_email_sync, user_doc['email'], 'New Task Notification', body)
        except Exception as e:
            print(f"Error notifying user {uid}: {e}")

@app.post('/api/tasks')
async def create_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    status = task.status if task.status in ['Pending', 'In Progress', 'Completed'] else 'Pending'
    priority = task.priority if task.priority in ['Low', 'Medium', 'High'] else 'Medium'
    category = (task.category or 'General').strip()[:60] or 'General'

    project_id = None
    if task.projectId and ObjectId.is_valid(task.projectId):
        project_id = ObjectId(task.projectId)

    label_ids = []
    for lid in (task.labels or []):
        if ObjectId.is_valid(lid):
            label_ids.append(ObjectId(lid))

    dep_ids = []
    for did in (task.dependencies or []):
        if ObjectId.is_valid(did):
            dep_ids.append(ObjectId(did))

    task_doc = {
        'userId': ObjectId(current_user),
        'title': task.title,
        'description': task.description,
        'status': status,
        'priority': priority,
        'category': category,
        'dueDate': task.dueDate,
        'recurrence': task.recurrence or 'None',
        'subtasks': task.subtasks or [],
        'attachmentLinks': task.attachmentLinks or [],
        'attachments': task.attachments or [],
        'assignee': (task.assignee or '').strip(),
        'collaborators': task.collaborators or [],
        'comments': [],
        'estimatedMinutes': max(0, task.estimatedMinutes or 0),
        'spentMinutes': 0,
        'projectId': project_id,
        'labels': label_ids,
        'dependencies': dep_ids,
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }

    result = await db.tasks.insert_one(task_doc)
    await log_activity(current_user, 'task_created', f'Created task "{task.title}"', str(result.inserted_id))
    await create_notification(current_user, 'task', 'Task Created', f'You created "{task.title}"')
    created = await db.tasks.find_one({'_id': result.inserted_id})
    asyncio.create_task(notify_task_users_creation(created, current_user))
    return to_public_task(created)


@app.put('/api/tasks/{task_id}')
async def update_task(task_id: str, task: TaskUpdate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail='Invalid task id')

    update_doc = {}
    if task.title is not None:
        update_doc['title'] = task.title
    if task.description is not None:
        update_doc['description'] = task.description
    if task.status is not None and task.status in ['Pending', 'In Progress', 'Completed']:
        update_doc['status'] = task.status
    if task.priority is not None and task.priority in ['Low', 'Medium', 'High']:
        update_doc['priority'] = task.priority
    if task.category is not None:
        update_doc['category'] = task.category.strip()[:60] or 'General'
    if task.dueDate is not None:
        update_doc['dueDate'] = task.dueDate or None
    if task.recurrence is not None:
        update_doc['recurrence'] = task.recurrence or 'None'
    if task.subtasks is not None:
        update_doc['subtasks'] = task.subtasks
    if task.attachmentLinks is not None:
        update_doc['attachmentLinks'] = task.attachmentLinks
    if task.attachments is not None:
        update_doc['attachments'] = task.attachments
    if task.assignee is not None:
        update_doc['assignee'] = task.assignee.strip()
    if task.collaborators is not None:
        update_doc['collaborators'] = task.collaborators
    if task.comments is not None:
        update_doc['comments'] = task.comments
    if task.estimatedMinutes is not None:
        update_doc['estimatedMinutes'] = max(0, task.estimatedMinutes)
    if task.spentMinutes is not None:
        update_doc['spentMinutes'] = max(0, task.spentMinutes)
    if task.projectId is not None:
        update_doc['projectId'] = ObjectId(task.projectId) if ObjectId.is_valid(task.projectId) else None
    if task.labels is not None:
        update_doc['labels'] = [ObjectId(lid) for lid in task.labels if ObjectId.is_valid(lid)]
    if task.dependencies is not None:
        update_doc['dependencies'] = [ObjectId(did) for did in task.dependencies if ObjectId.is_valid(did)]

    update_doc['updatedAt'] = now_iso()

    # Check for status change to "Completed" for notification
    old_task = await db.tasks.find_one({'_id': ObjectId(task_id), 'userId': ObjectId(current_user)})

    result = await db.tasks.update_one(
        {'_id': ObjectId(task_id), 'userId': ObjectId(current_user)},
        {'$set': update_doc},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Task not found')

    if old_task and task.status == 'Completed' and old_task.get('status') != 'Completed':
        await create_notification(current_user, 'completed', 'Task Completed', f'You completed "{old_task.get("title", "task")}"')

    await log_activity(current_user, 'task_updated', f'Updated task "{task_id}"', task_id)
    updated = await db.tasks.find_one({'_id': ObjectId(task_id), 'userId': ObjectId(current_user)})
    return to_public_task(updated)


@app.delete('/api/tasks/{task_id}')
async def delete_task(task_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail='Invalid task id')

    result = await db.tasks.delete_one({'_id': ObjectId(task_id), 'userId': ObjectId(current_user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Task not found')

    await log_activity(current_user, 'task_deleted', f'Deleted task "{task_id}"', task_id)
    return {'message': 'Task deleted successfully'}


@app.post('/api/tasks/bulk-action')
async def bulk_action(body: BulkActionRequest, current_user: str = Depends(get_current_user)):
    uid = ObjectId(current_user)
    valid_ids = [ObjectId(tid) for tid in body.taskIds if ObjectId.is_valid(tid)]

    if not valid_ids:
        raise HTTPException(status_code=400, detail='No valid task IDs provided')

    if body.action == 'delete':
        result = await db.tasks.delete_many({'_id': {'$in': valid_ids}, 'userId': uid})
        await log_activity(current_user, 'bulk_delete', f'Bulk deleted {result.deleted_count} tasks')
        return {'message': f'{result.deleted_count} tasks deleted'}

    if body.action == 'status_change' and body.status in ['Pending', 'In Progress', 'Completed']:
        result = await db.tasks.update_many(
            {'_id': {'$in': valid_ids}, 'userId': uid},
            {'$set': {'status': body.status, 'updatedAt': now_iso()}},
        )
        await log_activity(current_user, 'bulk_status', f'Bulk changed {result.modified_count} tasks to {body.status}')
        return {'message': f'{result.modified_count} tasks updated to {body.status}'}

    raise HTTPException(status_code=400, detail='Invalid action')


# ==================== DASHBOARD ====================

@app.get('/api/dashboard/stats')
async def get_dashboard_stats(current_user: str = Depends(get_current_user)):
    uid = ObjectId(current_user)
    cursor = db.tasks.find({'userId': uid})
    tasks = []
    async for doc in cursor:
        tasks.append(doc)

    now = datetime.now(timezone.utc)
    total = len(tasks)
    completed = [t for t in tasks if t['status'] == 'Completed']
    in_progress = [t for t in tasks if t['status'] == 'In Progress']
    pending = [t for t in tasks if t['status'] == 'Pending']

    overdue = []
    for t in tasks:
        if t['status'] != 'Completed' and t.get('dueDate'):
            due = parse_iso_datetime(t['dueDate'])
            if due and due < now:
                overdue.append(t)

    # Upcoming deadlines (next 7 days)
    upcoming = []
    week_later = now + timedelta(days=7)
    for t in tasks:
        if t['status'] != 'Completed' and t.get('dueDate'):
            due = parse_iso_datetime(t['dueDate'])
            if due and now <= due <= week_later:
                upcoming.append({
                    'id': str(t['_id']),
                    'title': t['title'],
                    'dueDate': t['dueDate'],
                    'priority': t['priority'],
                    'status': t['status'],
                })

    upcoming.sort(key=lambda x: x['dueDate'])

    # Category breakdown
    category_counts = {}
    for t in tasks:
        cat = t.get('category', 'General')
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Weekly completions (last 7 days)
    weekly_completions = [0] * 7
    # Use activity log for completed tasks
    seven_days_ago = now - timedelta(days=7)
    activity_cursor = db.activities.find({
        'userId': uid,
        'action': 'task_updated',
        'createdAt': {'$gte': seven_days_ago.isoformat()},
    })
    # Simpler approach: check task updatedAt for completed tasks
    for t in completed:
        updated = parse_iso_datetime(t.get('updatedAt', ''))
        if updated and updated >= seven_days_ago:
            day_index = (updated - seven_days_ago).days
            if 0 <= day_index < 7:
                weekly_completions[day_index] += 1

    # Completion rate
    completion_rate = round((len(completed) / total * 100) if total > 0 else 0, 1)

    # Productivity streak (consecutive days with at least 1 completed task)
    streak = 0
    check_date = now.date()
    for _ in range(365):
        day_start = datetime(check_date.year, check_date.month, check_date.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        found = False
        for t in completed:
            updated = parse_iso_datetime(t.get('updatedAt', ''))
            if updated and day_start <= updated < day_end:
                found = True
                break
        if found:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    # Total time spent
    total_time_spent = sum(t.get('spentMinutes', 0) for t in tasks)
    total_time_estimated = sum(t.get('estimatedMinutes', 0) for t in tasks)

    # Priority breakdown
    priority_counts = {'High': 0, 'Medium': 0, 'Low': 0}
    for t in tasks:
        p = t.get('priority', 'Medium')
        if p in priority_counts:
            priority_counts[p] += 1

    return {
        'total': total,
        'completed': len(completed),
        'inProgress': len(in_progress),
        'pending': len(pending),
        'overdue': len(overdue),
        'completionRate': completion_rate,
        'streak': streak,
        'weeklyCompletions': weekly_completions,
        'categoryBreakdown': category_counts,
        'priorityBreakdown': priority_counts,
        'upcomingDeadlines': upcoming[:10],
        'totalTimeSpent': total_time_spent,
        'totalTimeEstimated': total_time_estimated,
    }


# ==================== NOTIFICATIONS ====================

@app.get('/api/notifications')
async def get_notifications(current_user: str = Depends(get_current_user)):
    cursor = db.notifications.find({'userId': ObjectId(current_user)}).sort('createdAt', -1).limit(100)
    items = [to_public_notification(doc) async for doc in cursor]
    return items


@app.get('/api/notifications/unread-count')
async def get_unread_count(current_user: str = Depends(get_current_user)):
    count = await db.notifications.count_documents({'userId': ObjectId(current_user), 'read': False})
    return {'count': count}


@app.put('/api/notifications/{notification_id}/read')
async def mark_notification_read(notification_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail='Invalid notification ID')

    result = await db.notifications.update_one(
        {'_id': ObjectId(notification_id), 'userId': ObjectId(current_user)},
        {'$set': {'read': True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Notification not found')
    return {'message': 'Marked as read'}


@app.put('/api/notifications/read-all')
async def mark_all_read(current_user: str = Depends(get_current_user)):
    await db.notifications.update_many(
        {'userId': ObjectId(current_user), 'read': False},
        {'$set': {'read': True}},
    )
    return {'message': 'All notifications marked as read'}


# ==================== PROJECTS ====================

@app.get('/api/projects')
async def get_projects(current_user: str = Depends(get_current_user)):
    cursor = db.projects.find({
        '$or': [
            {'userId': ObjectId(current_user)},
            {'members': current_user},
        ]
    }).sort('createdAt', -1)
    items = [to_public_project(doc) async for doc in cursor]

    # Add task counts
    for project in items:
        task_count = await db.tasks.count_documents({'projectId': ObjectId(project['id'])})
        completed_count = await db.tasks.count_documents({'projectId': ObjectId(project['id']), 'status': 'Completed'})
        project['taskCount'] = task_count
        project['completedCount'] = completed_count

    return items


@app.post('/api/projects')
async def create_project(project: ProjectCreate, current_user: str = Depends(get_current_user)):
    doc = {
        'userId': ObjectId(current_user),
        'name': project.name,
        'description': project.description,
        'color': project.color,
        'icon': project.icon,
        'members': [],
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }
    result = await db.projects.insert_one(doc)
    await log_activity(current_user, 'project_created', f'Created project "{project.name}"')
    created = await db.projects.find_one({'_id': result.inserted_id})
    resp = to_public_project(created)
    resp['taskCount'] = 0
    resp['completedCount'] = 0
    return resp


@app.put('/api/projects/{project_id}')
async def update_project(project_id: str, project: ProjectUpdate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail='Invalid project ID')

    update_doc = {}
    if project.name is not None:
        update_doc['name'] = project.name
    if project.description is not None:
        update_doc['description'] = project.description
    if project.color is not None:
        update_doc['color'] = project.color
    if project.icon is not None:
        update_doc['icon'] = project.icon
    update_doc['updatedAt'] = now_iso()

    result = await db.projects.update_one(
        {'_id': ObjectId(project_id), 'userId': ObjectId(current_user)},
        {'$set': update_doc},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Project not found')

    updated = await db.projects.find_one({'_id': ObjectId(project_id)})
    return to_public_project(updated)


@app.delete('/api/projects/{project_id}')
async def delete_project(project_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail='Invalid project ID')

    result = await db.projects.delete_one({'_id': ObjectId(project_id), 'userId': ObjectId(current_user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Project not found')

    # Unlink tasks from the deleted project
    await db.tasks.update_many(
        {'projectId': ObjectId(project_id)},
        {'$set': {'projectId': None}},
    )
    await log_activity(current_user, 'project_deleted', f'Deleted project "{project_id}"')
    return {'message': 'Project deleted. Tasks have been unlinked.'}


@app.post('/api/projects/{project_id}/invite')
async def invite_to_project(project_id: str, invite: ProjectInvite, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail='Invalid project ID')

    project = await db.projects.find_one({'_id': ObjectId(project_id), 'userId': ObjectId(current_user)})
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    invited_user = await db.users.find_one({'email': invite.email})
    if not invited_user:
        raise HTTPException(status_code=404, detail='User with this email not found')

    invited_id = str(invited_user['_id'])
    if invited_id in project.get('members', []) or invited_id == current_user:
        raise HTTPException(status_code=400, detail='User is already a member')

    await db.projects.update_one(
        {'_id': ObjectId(project_id)},
        {'$addToSet': {'members': invited_id}},
    )

    await create_notification(
        invited_id, 'invite',
        'Project Invitation',
        f'You have been invited to project "{project["name"]}"',
    )
    if is_smtp_configured() and invited_user.get('email'):
        body = f'Hello {invited_user.get("name", "User")},\n\nYou have been invited to collaborate on the project "{project["name"]}".\n\nTaskFlow'
        try:
            await asyncio.to_thread(send_email_sync, invited_user['email'], 'Project Invitation', body)
        except Exception:
            pass

    return {'message': f'Invited {invite.email} to the project'}


@app.get('/api/projects/{project_id}/tasks')
async def get_project_tasks(project_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(project_id):
        raise HTTPException(status_code=400, detail='Invalid project ID')

    cursor = db.tasks.find({
        'projectId': ObjectId(project_id),
        'userId': ObjectId(current_user),
    }).sort('createdAt', -1)
    tasks = [to_public_task(doc) async for doc in cursor]
    return tasks


# ==================== LABELS ====================

@app.get('/api/labels')
async def get_labels(current_user: str = Depends(get_current_user)):
    cursor = db.labels.find({'userId': ObjectId(current_user)})
    return [to_public_label(doc) async for doc in cursor]


@app.post('/api/labels')
async def create_label(label: LabelCreate, current_user: str = Depends(get_current_user)):
    doc = {
        'userId': ObjectId(current_user),
        'name': label.name,
        'color': label.color,
    }
    result = await db.labels.insert_one(doc)
    created = await db.labels.find_one({'_id': result.inserted_id})
    return to_public_label(created)


@app.delete('/api/labels/{label_id}')
async def delete_label(label_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(label_id):
        raise HTTPException(status_code=400, detail='Invalid label ID')

    result = await db.labels.delete_one({'_id': ObjectId(label_id), 'userId': ObjectId(current_user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Label not found')

    # Remove label from all tasks
    await db.tasks.update_many(
        {'userId': ObjectId(current_user)},
        {'$pull': {'labels': ObjectId(label_id)}},
    )
    return {'message': 'Label deleted'}


# ==================== TASK TEMPLATES ====================

@app.get('/api/task-templates')
async def get_templates(current_user: str = Depends(get_current_user)):
    cursor = db.task_templates.find({'userId': ObjectId(current_user)}).sort('createdAt', -1)
    return [to_public_template(doc) async for doc in cursor]


@app.post('/api/task-templates')
async def create_template(template: TemplateCreate, current_user: str = Depends(get_current_user)):
    doc = {
        'userId': ObjectId(current_user),
        'name': template.name,
        'title': template.title,
        'description': template.description,
        'priority': template.priority,
        'category': template.category,
        'subtasks': template.subtasks or [],
        'estimatedMinutes': template.estimatedMinutes or 0,
        'createdAt': now_iso(),
    }
    result = await db.task_templates.insert_one(doc)
    created = await db.task_templates.find_one({'_id': result.inserted_id})
    return to_public_template(created)


@app.delete('/api/task-templates/{template_id}')
async def delete_template(template_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail='Invalid template ID')

    result = await db.task_templates.delete_one({'_id': ObjectId(template_id), 'userId': ObjectId(current_user)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Template not found')
    return {'message': 'Template deleted'}


# ==================== FILE UPLOAD ====================

@app.post('/api/upload')
async def upload_file(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail='No file provided')

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f'File type {ext} not allowed')

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail='File too large (max 10 MB)')

    safe_name = f'{uuid.uuid4().hex}{ext}'
    file_path = UPLOAD_DIR / safe_name
    file_path.write_bytes(content)

    return {
        'filename': safe_name,
        'originalName': file.filename,
        'size': len(content),
        'url': f'/api/uploads/{safe_name}',
    }


@app.get('/api/uploads/{filename}')
async def serve_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(file_path)


# ==================== ACTIVITIES ====================

@app.get('/api/activities')
async def get_activities(current_user: str = Depends(get_current_user)):
    cursor = db.activities.find({'userId': ObjectId(current_user)}).sort('createdAt', -1).limit(50)
    items = []
    async for doc in cursor:
        items.append(
            {
                'id': str(doc['_id']),
                'taskId': str(doc['taskId']) if doc.get('taskId') else None,
                'action': doc.get('action'),
                'message': doc.get('message'),
                'createdAt': doc.get('createdAt'),
            }
        )
    return items


# ==================== CONTACT ====================

@app.post('/api/contact')
async def submit_contact(message: ContactMessage, current_user: str = Depends(get_current_user)):
    doc = {
        'userId': ObjectId(current_user),
        'name': message.name,
        'email': message.email,
        'subject': message.subject,
        'message': message.message,
        'submittedAt': now_iso(),
    }
    result = await db.contacts.insert_one(doc)

    return {
        'id': str(result.inserted_id),
        'name': message.name,
        'email': message.email,
        'subject': message.subject,
        'message': message.message,
        'submittedAt': doc['submittedAt'],
    }


@app.get('/')
async def root():
    return {'message': 'TaskFlow API is running with MongoDB'}
