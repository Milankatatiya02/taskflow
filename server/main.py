"""
TaskFlow - FastAPI Backend Server
Simple REST API for task management with JSON file storage.
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json
import uuid
import os
from functools import wraps

app = FastAPI(title="TaskFlow API")

# CORS - allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data file path ───
DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")


def read_data():
    """Read data from JSON file."""
    if not os.path.exists(DATA_FILE):
        return {"users": [], "tasks": [], "preferences": {}}
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def write_data(data):
    """Write data to JSON file."""
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ─── Authentication Helper ───
def get_current_user(authorization: str = Header(None)):
    """Extract user from Bearer token (simplified - no actual JWT validation)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        # In production, validate JWT token here
        # For now, we'll treat token as user_id
        return token
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")


# ─── Pydantic Models ───

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
    status: str = Field(default="Pending")  # Pending, In Progress, Completed
    priority: str = Field(default="Medium")  # Low, Medium, High


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class PreferencesModel(BaseModel):
    emailNotifications: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    taskReminders: Optional[bool] = None
    weeklyReport: Optional[bool] = None
    twoFactor: Optional[bool] = None


# ─── Auth Endpoints ───

@app.post("/api/auth/register")
def register(user: UserRegister):
    data = read_data()

    # Check if email already exists
    for existing_user in data["users"]:
        if existing_user["email"] == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "password": user.password,  # In production, hash this!
        "phone": "",
        "bio": "",
        "createdAt": datetime.now().isoformat()
    }
    data["users"].append(new_user)
    
    # Initialize preferences for new user
    if "preferences" not in data:
        data["preferences"] = {}
    data["preferences"][new_user["id"]] = {
        "emailNotifications": True,
        "pushNotifications": True,
        "taskReminders": True,
        "weeklyReport": True,
        "twoFactor": False
    }
    
    write_data(data)

    # Return user without password and generate token
    return {
        "message": "Registration successful",
        "token": new_user["id"],  # In production, generate JWT token
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"]
        }
    }


@app.post("/api/auth/login")
def login(user: UserLogin):
    data = read_data()

    for existing_user in data["users"]:
        if existing_user["email"] == user.email and existing_user["password"] == user.password:
            # Initialize preferences if not exists
            if "preferences" not in data:
                data["preferences"] = {}
            if existing_user["id"] not in data["preferences"]:
                data["preferences"][existing_user["id"]] = {
                    "emailNotifications": True,
                    "pushNotifications": True,
                    "taskReminders": True,
                    "weeklyReport": True,
                    "twoFactor": False
                }
            
            return {
                "message": "Login successful",
                "token": existing_user["id"],  # In production, generate JWT token
                "user": {
                    "id": existing_user["id"],
                    "name": existing_user["name"],
                    "email": existing_user["email"],
                    "phone": existing_user.get("phone", ""),
                    "bio": existing_user.get("bio", "")
                }
            }

    raise HTTPException(status_code=401, detail="Invalid email or password")


# ─── User Profile Endpoints ───

@app.get("/api/user/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    data = read_data()
    
    for user in data["users"]:
        if user["id"] == current_user:
            return {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "phone": user.get("phone", ""),
                "bio": user.get("bio", ""),
                "createdAt": user.get("createdAt", "")
            }
    
    raise HTTPException(status_code=404, detail="User not found")


@app.put("/api/user/profile")
def update_profile(profile: UserProfile, current_user: str = Depends(get_current_user)):
    data = read_data()
    
    for i, user in enumerate(data["users"]):
        if user["id"] == current_user:
            if profile.name:
                data["users"][i]["name"] = profile.name
            if profile.email:
                data["users"][i]["email"] = profile.email
            if profile.phone:
                data["users"][i]["phone"] = profile.phone
            if profile.bio is not None:
                data["users"][i]["bio"] = profile.bio
            
            data["users"][i]["updatedAt"] = datetime.now().isoformat()
            write_data(data)
            
            return {
                "id": data["users"][i]["id"],
                "name": data["users"][i]["name"],
                "email": data["users"][i]["email"],
                "phone": data["users"][i].get("phone", ""),
                "bio": data["users"][i].get("bio", "")
            }
    
    raise HTTPException(status_code=404, detail="User not found")


@app.put("/api/user/password")
def change_password(pwd_change: PasswordChange, current_user: str = Depends(get_current_user)):
    data = read_data()
    
    for i, user in enumerate(data["users"]):
        if user["id"] == current_user:
            if user["password"] != pwd_change.currentPassword:
                raise HTTPException(status_code=401, detail="Current password is incorrect")
            
            data["users"][i]["password"] = pwd_change.newPassword
            write_data(data)
            return {"message": "Password changed successfully"}
    
    raise HTTPException(status_code=404, detail="User not found")


@app.get("/api/user/preferences")
def get_preferences(current_user: str = Depends(get_current_user)):
    data = read_data()
    
    if "preferences" not in data:
        data["preferences"] = {}
    
    if current_user in data["preferences"]:
        return data["preferences"][current_user]
    
    # Return default preferences
    default_prefs = {
        "emailNotifications": True,
        "pushNotifications": True,
        "taskReminders": True,
        "weeklyReport": True,
        "twoFactor": False
    }
    data["preferences"][current_user] = default_prefs
    write_data(data)
    return default_prefs


@app.put("/api/user/preferences")
def update_preferences(prefs: PreferencesModel, current_user: str = Depends(get_current_user)):
    data = read_data()
    
    if "preferences" not in data:
        data["preferences"] = {}
    
    if current_user not in data["preferences"]:
        data["preferences"][current_user] = {
            "emailNotifications": True,
            "pushNotifications": True,
            "taskReminders": True,
            "weeklyReport": True,
            "twoFactor": False
        }
    
    # Update only provided fields
    if prefs.emailNotifications is not None:
        data["preferences"][current_user]["emailNotifications"] = prefs.emailNotifications
    if prefs.pushNotifications is not None:
        data["preferences"][current_user]["pushNotifications"] = prefs.pushNotifications
    if prefs.taskReminders is not None:
        data["preferences"][current_user]["taskReminders"] = prefs.taskReminders
    if prefs.weeklyReport is not None:
        data["preferences"][current_user]["weeklyReport"] = prefs.weeklyReport
    if prefs.twoFactor is not None:
        data["preferences"][current_user]["twoFactor"] = prefs.twoFactor
    
    write_data(data)
    return data["preferences"][current_user]


# ─── Task Endpoints ───

@app.get("/api/tasks")
def get_all_tasks(current_user: str = Depends(get_current_user)):
    """Get all tasks for the current user."""
    data = read_data()
    user_tasks = [task for task in data["tasks"] if task["userId"] == current_user]
    return user_tasks


@app.get("/api/tasks/{user_id}")
def get_user_tasks(user_id: str, current_user: str = Depends(get_current_user)):
    """Get tasks for a specific user (for backward compatibility)."""
    data = read_data()
    user_tasks = [task for task in data["tasks"] if task["userId"] == user_id]
    return {"tasks": user_tasks}


@app.post("/api/tasks")
def create_task(task: TaskCreate, current_user: str = Depends(get_current_user)):
    data = read_data()

    # Validate status and priority values
    valid_statuses = ["Pending", "In Progress", "Completed", "pending", "in-progress", "completed"]
    valid_priorities = ["Low", "Medium", "High", "low", "medium", "high"]

    status = task.status if task.status in valid_statuses else "Pending"
    priority = task.priority if task.priority in valid_priorities else "Medium"

    new_task = {
        "id": str(uuid.uuid4()),
        "userId": current_user,
        "title": task.title,
        "description": task.description,
        "status": status,
        "priority": priority,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    data["tasks"].append(new_task)
    write_data(data)

    return new_task


@app.put("/api/tasks/{task_id}")
def update_task(task_id: str, task: TaskUpdate, current_user: str = Depends(get_current_user)):
    data = read_data()

    for i, existing_task in enumerate(data["tasks"]):
        if existing_task["id"] == task_id and existing_task["userId"] == current_user:
            if task.title is not None:
                data["tasks"][i]["title"] = task.title
            if task.description is not None:
                data["tasks"][i]["description"] = task.description
            if task.status is not None:
                valid_statuses = ["Pending", "In Progress", "Completed", "pending", "in-progress", "completed"]
                data["tasks"][i]["status"] = task.status if task.status in valid_statuses else existing_task["status"]
            if task.priority is not None:
                valid_priorities = ["Low", "Medium", "High", "low", "medium", "high"]
                data["tasks"][i]["priority"] = task.priority if task.priority in valid_priorities else existing_task["priority"]

            data["tasks"][i]["updatedAt"] = datetime.now().isoformat()
            write_data(data)
            return data["tasks"][i]

    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, current_user: str = Depends(get_current_user)):
    data = read_data()

    for i, existing_task in enumerate(data["tasks"]):
        if existing_task["id"] == task_id and existing_task["userId"] == current_user:
            deleted_task = data["tasks"].pop(i)
            write_data(data)
            return {"message": "Task deleted successfully", "task": deleted_task}

    raise HTTPException(status_code=404, detail="Task not found")


# ─── Root ───
@app.get("/")
def root():
    return {"message": "TaskFlow API is running!"}
