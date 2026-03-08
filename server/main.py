"""
TaskFlow - FastAPI Backend Server with MongoDB storage.
"""

import asyncio
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
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
SMTP_HOST = os.getenv('SMTP_HOST', '')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', SMTP_USERNAME or 'noreply@taskflow.local')
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
REMINDER_INTERVAL_SECONDS = int(os.getenv('REMINDER_INTERVAL_SECONDS', '60'))
REMINDER_MINUTES_BEFORE = int(os.getenv('REMINDER_MINUTES_BEFORE', '60'))

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
mongo_client: Optional[AsyncIOMotorClient] = None
db = None
reminder_loop_task: Optional[asyncio.Task] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_access_token(user_id: str) -> str:
    expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + expires_delta,
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def to_public_user(user_doc: dict) -> dict:
    return {
        'id': str(user_doc['_id']),
        'name': user_doc.get('name', ''),
        'email': user_doc.get('email', ''),
        'phone': user_doc.get('phone', ''),
        'bio': user_doc.get('bio', ''),
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
        'assignee': task_doc.get('assignee', ''),
        'collaborators': task_doc.get('collaborators', []),
        'comments': task_doc.get('comments', []),
        'estimatedMinutes': task_doc.get('estimatedMinutes', 0),
        'spentMinutes': task_doc.get('spentMinutes', 0),
        'createdAt': task_doc['createdAt'],
        'updatedAt': task_doc['updatedAt'],
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
    assignee: Optional[str] = ''
    collaborators: Optional[List[str]] = Field(default_factory=list)
    estimatedMinutes: Optional[int] = 0


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
    assignee: Optional[str] = None
    collaborators: Optional[List[str]] = None
    comments: Optional[List[Dict[str, Any]]] = None
    estimatedMinutes: Optional[int] = None
    spentMinutes: Optional[int] = None


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


DEFAULT_PREFS = {
    'emailNotifications': True,
    'pushNotifications': True,
    'taskReminders': True,
    'weeklyReport': True,
    'twoFactor': False,
}


@app.on_event('startup')
async def startup_db_client() -> None:
    global mongo_client, db, reminder_loop_task
    mongo_client = AsyncIOMotorClient(MONGODB_URI)
    db = mongo_client[MONGODB_DB]

    await db.users.create_index('email', unique=True)
    await db.tasks.create_index([('userId', 1), ('createdAt', -1)])
    await db.tasks.create_index([('status', 1), ('dueDate', 1)])
    await db.preferences.create_index('userId', unique=True)
    await db.activities.create_index([('userId', 1), ('createdAt', -1)])
    reminder_loop_task = asyncio.create_task(reminder_worker())


@app.on_event('shutdown')
async def shutdown_db_client() -> None:
    global reminder_loop_task
    if reminder_loop_task is not None:
        reminder_loop_task.cancel()
        reminder_loop_task = None
    if mongo_client is not None:
        mongo_client.close()


@app.post('/api/auth/register')
async def register(user: UserRegister):
    existing = await db.users.find_one({'email': user.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    user_doc = {
        'name': user.name,
        'email': user.email,
        'password': get_password_hash(user.password),
        'phone': '',
        'bio': '',
        'createdAt': now_iso(),
    }
    result = await db.users.insert_one(user_doc)

    await db.preferences.update_one(
        {'userId': result.inserted_id},
        {'$setOnInsert': {**DEFAULT_PREFS, 'userId': result.inserted_id}},
        upsert=True,
    )

    return {
        'message': 'Registration successful',
        'token': create_access_token(str(result.inserted_id)),
        'user': {'id': str(result.inserted_id), 'name': user.name, 'email': user.email},
    }


@app.post('/api/auth/login')
async def login(user: UserLogin):
    existing_user = await db.users.find_one({'email': user.email})
    if not existing_user:
        raise HTTPException(status_code=401, detail='Invalid email or password')

    stored_password = existing_user.get('password', '')
    is_valid_password = False

    # Backward compatibility: auto-upgrade old plaintext passwords after successful login.
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

    return {
        'message': 'Login successful',
        'token': create_access_token(str(existing_user['_id'])),
        'user': {
            'id': str(existing_user['_id']),
            'name': existing_user['name'],
            'email': existing_user['email'],
            'phone': existing_user.get('phone', ''),
            'bio': existing_user.get('bio', ''),
        },
    }


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


@app.post('/api/tasks')
async def create_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    status = task.status if task.status in ['Pending', 'In Progress', 'Completed'] else 'Pending'
    priority = task.priority if task.priority in ['Low', 'Medium', 'High'] else 'Medium'
    category = (task.category or 'General').strip()[:60] or 'General'

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
        'assignee': (task.assignee or '').strip(),
        'collaborators': task.collaborators or [],
        'comments': [],
        'estimatedMinutes': max(0, task.estimatedMinutes or 0),
        'spentMinutes': 0,
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }

    result = await db.tasks.insert_one(task_doc)
    await log_activity(current_user, 'task_created', f'Created task "{task.title}"', str(result.inserted_id))
    created = await db.tasks.find_one({'_id': result.inserted_id})
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

    update_doc['updatedAt'] = now_iso()

    result = await db.tasks.update_one(
        {'_id': ObjectId(task_id), 'userId': ObjectId(current_user)},
        {'$set': update_doc},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Task not found')

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
