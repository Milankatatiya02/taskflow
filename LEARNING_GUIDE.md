# 📋 TaskFlow — Learning Guide

A comprehensive beginner-friendly guide to understanding every part of this React + FastAPI task management application. This document covers all the concepts, patterns, and code used in this project so you can explain and discuss it confidently.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Tech Stack Explained](#3-tech-stack-explained)
4. [React Core Concepts Used](#4-react-core-concepts-used)
5. [React Router — Navigation & Routing](#5-react-router--navigation--routing)
6. [Context API — Global State Management](#6-context-api--global-state-management)
7. [Making API Calls with Axios](#7-making-api-calls-with-axios)
8. [CRUD Operations Explained](#8-crud-operations-explained)
9. [Form Validation Techniques](#9-form-validation-techniques)
10. [Material UI (MUI) — Component Library](#10-material-ui-mui--component-library)
11. [CSS Animations & Styling](#11-css-animations--styling)
12. [Backend — FastAPI Server](#12-backend--fastapi-server)
13. [File-by-File Code Walkthrough](#13-file-by-file-code-walkthrough)
14. [How to Run the Project](#14-how-to-run-the-project)
15. [Common Interview Questions](#15-common-interview-questions)

---

## 1. Project Overview

**TaskFlow** is a full-stack task management application where users can:

- **Register** a new account
- **Login** with their credentials
- **View a Dashboard** with task statistics (total, completed, in-progress, pending)
- **Create, Read, Update, and Delete (CRUD)** tasks
- **Filter** tasks by status, priority, and search keywords
- **Logout** securely

It demonstrates real-world full-stack development patterns using **React** for the frontend and **Python FastAPI** for the backend.

---

## 2. Folder Structure

```
taskflow/
├── index.html              ← Vite entry HTML (mounts React)
├── package.json            ← Dependencies & npm scripts
├── vite.config.js          ← Vite build configuration
├── eslint.config.js        ← Linting rules
├── LEARNING_GUIDE.md       ← This file!
│
├── public/                 ← Static assets (served as-is)
│
├── src/                    ← Frontend source code
│   ├── main.jsx            ← React entry point (renders <App />)
│   ├── App.jsx             ← Root component (theme, routes)
│   ├── index.css           ← Global CSS styles
│   │
│   ├── context/
│   │   └── AuthContext.jsx ← Authentication state (login/register/logout)
│   │
│   ├── components/
│   │   ├── Navbar.jsx      ← Top navigation bar (responsive)
│   │   └── ProtectedRoute.jsx ← Redirects unauthenticated users
│   │
│   └── pages/
│       ├── Home.jsx        ← Dashboard with stats & recent tasks
│       ├── Tasks.jsx       ← Full task CRUD with filters
│       ├── Login.jsx       ← Login form with validation
│       └── Register.jsx    ← Registration form with validation
│
└── server/                 ← Backend (Python)
    ├── main.py             ← FastAPI server with all endpoints
    ├── data.json           ← JSON file database
    └── requirements.txt    ← Python dependencies
```

---

## 3. Tech Stack Explained

| Technology | Role | Why We Use It |
|-----------|------|---------------|
| **React 19** | Frontend UI library | Component-based architecture, virtual DOM for fast updates |
| **Vite** | Build tool & dev server | Extremely fast HMR (Hot Module Replacement), modern ES modules |
| **React Router v7** | Client-side routing | SPA navigation without page reloads |
| **Axios** | HTTP client | Clean syntax for API calls, automatic JSON handling |
| **MUI (Material UI) v7** | Component library | Pre-built, responsive, accessible UI components |
| **Context API** | State management | Share auth state across all components without prop drilling |
| **FastAPI** | Backend framework | Fast Python API framework with automatic validation |
| **Pydantic** | Data validation | Validates request data with Python type hints |
| **JSON file** | Data storage | Simple file-based storage (no database setup needed) |

---

## 4. React Core Concepts Used

### 4.1 Components

Components are **reusable building blocks** of the UI. In TaskFlow, each file exports a single component:

```jsx
// A functional component
function Login() {
    return <div>Login Page</div>;
}
export default Login;
```

**Components used in TaskFlow:**
- `App` — root component wrapping everything
- `Navbar` — navigation bar
- `ProtectedRoute` — auth guard
- `Home`, `Tasks`, `Login`, `Register` — page components

### 4.2 JSX (JavaScript XML)

JSX lets you write HTML-like code inside JavaScript:

```jsx
// JSX example from Navbar.jsx
<Typography variant="h6" fontWeight={700}>
    📋 TaskFlow
</Typography>
```

**Key rules:**
- Use `className` instead of `class`
- Use `{}` to embed JavaScript expressions: `{user.name}`
- Self-close tags without children: `<MenuIcon />`
- Return a single parent element (use `<>...</>` fragments)

### 4.3 State with `useState`

State is **data that changes over time** and triggers re-renders when updated:

```jsx
const [tasks, setTasks] = useState([]);      // Array of tasks
const [loading, setLoading] = useState(true);  // Boolean flag
const [formData, setFormData] = useState({     // Object
    title: '', description: '', status: 'Pending', priority: 'Medium'
});
```

**Pattern:** `const [value, setValue] = useState(initialValue);`

- `value` — current state
- `setValue` — function to update state (triggers re-render)
- `initialValue` — what the state starts as

### 4.4 Effects with `useEffect`

Side effects (API calls, subscriptions, timers) go in `useEffect`:

```jsx
// Runs ONCE when component mounts (empty dependency array)
useEffect(() => {
    fetchTasks();
}, []);

// Runs on EVERY render (no dependency array) — avoid this
useEffect(() => {
    console.log('rendered');
});

// Runs when `user` changes
useEffect(() => {
    if (user) fetchData();
}, [user]);
```

**The dependency array `[]`** controls WHEN the effect runs:
- `[]` = once on mount
- `[a, b]` = when `a` or `b` changes
- omitted = every render

### 4.5 Props

Props pass data from **parent to child** components:

```jsx
// Parent passes data
<ProtectedRoute>
    <Home />
</ProtectedRoute>

// Child receives via props
function ProtectedRoute({ children }) {
    // `children` is whatever is between the opening/closing tags
    return user ? children : <Navigate to="/login" />;
}
```

### 4.6 Conditional Rendering

Show different UI based on conditions:

```jsx
// Ternary operator (inline if-else)
{user ? <Navigate to="/" /> : <Login />}

// Logical AND (show only if true)
{serverError && <Alert severity="error">{serverError}</Alert>}

// Early return
if (loading) return null;
if (!user) return <Navigate to="/login" />;
```

### 4.7 Lists & Keys

Render arrays of data with `.map()`:

```jsx
{navItems.map((item) => (
    <Button key={item.label}>
        {item.label}
    </Button>
))}
```

**`key`** is required — React uses it to efficiently track which items changed. Always use a **unique identifier** (like `id`), not array index.

---

## 5. React Router — Navigation & Routing

### How Routing Works

React Router enables **client-side routing** — the browser URL changes but the page doesn't reload.

```jsx
// App.jsx — Route definitions
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

<Router>
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
</Router>
```

### Key Router Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| `<Route>` | Maps URL path to a component | `<Route path="/tasks" element={<Tasks />} />` |
| `<Navigate>` | Redirects to another route | `<Navigate to="/login" />` |
| `useNavigate()` | Programmatic navigation | `navigate('/login')` after logout |
| `useLocation()` | Access current URL path | Highlight active nav link |
| `<Link>` | Clickable navigation link | `<Link to="/register">Sign Up</Link>` |
| `path="*"` | Catch-all for unknown routes | Redirect to home |

### Protected Routes

```jsx
// ProtectedRoute.jsx
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <CircularProgress />;   // Show spinner while checking
    if (!user) return <Navigate to="/login" />;  // Not logged in → redirect

    return children;  // Logged in → show the page
}
```

This wraps any route that requires authentication. If the user isn't logged in, they're automatically redirected to `/login`.

---

## 6. Context API — Global State Management

### The Problem: Prop Drilling

Without Context, you'd need to pass `user` data through every component:

```
App → Navbar → user (needs it)
App → ProtectedRoute → Home → user (needs it)
App → ProtectedRoute → Tasks → user (needs it)
```

### The Solution: Context

Context provides a **global store** accessible by any component:

```jsx
// 1. CREATE the context
const AuthContext = createContext(null);

// 2. PROVIDE the context (wraps the app)
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const login = async (email, password) => {
        const response = await axios.post(`${API_URL}/login`, { email, password });
        setUser(response.data.user);
        localStorage.setItem('taskflow_user', JSON.stringify(response.data.user));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('taskflow_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. CONSUME the context (any component)
export function useAuth() {
    return useContext(AuthContext);
}

// Usage in any component:
const { user, login, logout } = useAuth();
```

### localStorage Persistence

When the user logs in, their data is saved to `localStorage`:

```jsx
localStorage.setItem('taskflow_user', JSON.stringify(userData));
```

On page refresh, the app checks `localStorage` to restore the session:

```jsx
useEffect(() => {
    const savedUser = localStorage.getItem('taskflow_user');
    if (savedUser) {
        setUser(JSON.parse(savedUser));
    }
    setLoading(false);
}, []);
```

---

## 7. Making API Calls with Axios

### What is Axios?

Axios is an HTTP client that makes it easy to send requests to the backend:

```jsx
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// GET request — fetch data
const response = await axios.get(`${API_URL}/tasks/${user.id}`);
console.log(response.data.tasks);

// POST request — send data
const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'user@example.com',
    password: 'password123'
});

// PUT request — update data
await axios.put(`${API_URL}/tasks/${taskId}`, { title: 'Updated Title' });

// DELETE request — remove data
await axios.delete(`${API_URL}/tasks/${taskId}`);
```

### Error Handling Pattern

```jsx
try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    // Success — use response.data
    return { success: true };
} catch (error) {
    // Failure — extract error message from backend
    return {
        success: false,
        message: error.response?.data?.detail || 'Something went wrong'
    };
}
```

**`error.response?.data?.detail`** — optional chaining (`?.`) safely accesses nested properties without crashing if any part is `undefined`.

---

## 8. CRUD Operations Explained

CRUD stands for **Create, Read, Update, Delete** — the four basic data operations.

### In TaskFlow (`Tasks.jsx`):

| Operation | HTTP Method | Endpoint | Frontend Function |
|-----------|------------|----------|-------------------|
| **Create** | `POST` | `/api/tasks?user_id=xxx` | `handleCreate()` |
| **Read** | `GET` | `/api/tasks/{user_id}` | `fetchTasks()` |
| **Update** | `PUT` | `/api/tasks/{task_id}` | `handleUpdate()` |
| **Delete** | `DELETE` | `/api/tasks/{task_id}` | `handleDelete()` |

### Create Example

```jsx
const handleCreate = async () => {
    if (!validateForm()) return;  // Validate first

    const response = await axios.post(`${API_URL}/tasks?user_id=${user.id}`, formData);
    setTasks([...tasks, response.data.task]);  // Add new task to state
    closeDialog();
    showSnackbar('Task created successfully!');
};
```

**`setTasks([...tasks, response.data.task])`** — creates a new array with all existing tasks + the new one. We never mutate state directly in React.

### Update Example

```jsx
const handleUpdate = async () => {
    const response = await axios.put(`${API_URL}/tasks/${editingTask.id}`, formData);
    setTasks(tasks.map(t => t.id === editingTask.id ? response.data.task : t));
};
```

**`.map()`** creates a new array, replacing the updated task while keeping others unchanged.

### Delete Example

```jsx
const handleDelete = async () => {
    await axios.delete(`${API_URL}/tasks/${deleteDialog.taskId}`);
    setTasks(tasks.filter(t => t.id !== deleteDialog.taskId));
};
```

**`.filter()`** creates a new array excluding the deleted task.

---

## 9. Form Validation Techniques

### Client-Side Validation Pattern

Before sending data to the server, we validate on the frontend:

```jsx
const validate = () => {
    const newErrors = {};

    // Required field check
    if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
    }
    // Format check (regex)
    else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
    }

    // Length check
    if (!formData.password) {
        newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
    }

    // Match check (Register page)
    if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;  // true if no errors
};
```

### Inline Error Display

MUI TextFields have built-in error display:

```jsx
<TextField
    error={!!errors.email}          // Red border if error exists
    helperText={errors.email}        // Error message below field
/>
```

### Clear Errors on Typing

```jsx
const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
        setErrors({ ...errors, [e.target.name]: '' });  // Clear error
    }
};
```

**`[e.target.name]`** — computed property name. If the input has `name="email"`, this becomes `{ email: '<typed value>' }`.

---

## 10. Material UI (MUI) — Component Library

### What is MUI?

MUI provides pre-built, styled, accessible React components. Instead of writing HTML + CSS from scratch, you use MUI components:

```jsx
// Instead of: <button class="btn btn-primary">Click</button>
<Button variant="contained" color="primary">Click</Button>

// Instead of: <input type="text" class="form-control">
<TextField label="Email" fullWidth />
```

### MUI Components Used in TaskFlow

| Component | Purpose | Where Used |
|-----------|---------|------------|
| `AppBar`, `Toolbar` | Top navigation bar | Navbar |
| `Typography` | Text with preset styles | Everywhere |
| `Button` | Clickable buttons | Forms, actions |
| `TextField` | Input fields | Login, Register, Tasks |
| `Card`, `CardContent` | Content cards | Dashboard stats, task cards |
| `Grid` | Responsive grid layout | Dashboard, task list |
| `Dialog` | Modal popups | Create/edit task, delete confirmation |
| `Chip` | Status/priority badges | Task cards |
| `Alert` | Error/success messages | Forms |
| `Snackbar` | Toast notifications | After CRUD actions |
| `Select`, `MenuItem` | Dropdown menus | Filters, task form |
| `Avatar` | User initials circle | Navbar |
| `Drawer` | Mobile side navigation | Navbar (responsive) |
| `CircularProgress` | Loading spinner | ProtectedRoute |
| `IconButton` | Icon-only buttons | Edit, delete actions |
| `Tooltip` | Hover hints | Action buttons |

### The `sx` Prop — Inline Styling

MUI's `sx` prop lets you write CSS directly:

```jsx
<Box sx={{
    p: 2,                           // padding: 16px (1 unit = 8px)
    mb: 3,                          // margin-bottom: 24px
    display: 'flex',
    bgcolor: '#6C63FF',             // background-color
    borderRadius: 3,                // border-radius: 12px
    '&:hover': { bgcolor: '#5A52E0' },  // hover state
    animation: 'fadeIn 0.5s ease-out'    // CSS animation
}}>
```

### MUI Theme Customization

In `App.jsx`, we customize the default MUI theme:

```jsx
const theme = createTheme({
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: {
        borderRadius: 8,  // Default border radius for all components
    },
    palette: {
        primary: {
            main: '#6C63FF',  // Primary brand color
        },
    },
});
```

### Responsive Design with MUI

```jsx
// Breakpoint-aware padding
sx={{ p: { xs: 2, md: 4 } }}  // 16px on mobile, 32px on desktop

// Responsive grid
<Grid size={{ xs: 12, sm: 6, md: 4 }}>  // Full, half, third width

// Media query hook
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
{isMobile ? <MobileMenu /> : <DesktopMenu />}
```

---

## 11. CSS Animations & Styling

### Global Styles (`index.css`)

```css
/* Google Font import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* CSS Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Global body styles */
body {
    font-family: 'Inter', 'Roboto', sans-serif;
    background-color: #f8f9fa;
    -webkit-font-smoothing: antialiased;
}
```

### CSS Keyframe Animations (via MUI `sx`)

```jsx
// Fade in + slide up animation
sx={{
    animation: 'fadeInUp 0.6s ease-out',
    '@keyframes fadeInUp': {
        from: { opacity: 0, transform: 'translateY(30px)' },
        to: { opacity: 1, transform: 'translateY(0)' }
    }
}}

// Staggered animation (each card appears with a delay)
sx={{
    animation: `slideUp 0.5s ease-out ${index * 0.1}s both`,
    // index=0 → 0s delay, index=1 → 0.1s, index=2 → 0.2s, etc.
}}

// Hover transition
sx={{
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
    }
}}
```

### Animation Properties Explained

| Property | What It Does |
|----------|-------------|
| `animation-name` | Name of the `@keyframes` to use |
| `animation-duration` | How long (e.g., `0.5s`) |
| `animation-timing` | Speed curve (`ease-out` = starts fast, ends slow) |
| `animation-delay` | Wait before starting |
| `animation-fill-mode` | `both` = keeps start/end state |
| `transition` | Smooth change between states (e.g., hover) |
| `transform` | Move, rotate, scale elements |

---

## 12. Backend — FastAPI Server

### What is FastAPI?

FastAPI is a modern Python web framework for building APIs. It's fast, uses Python type hints for validation, and auto-generates API documentation.

### Server Setup (`server/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TaskFlow API")

# CORS — allows the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### What is CORS?

**CORS (Cross-Origin Resource Sharing)** — browsers block requests from one domain to another by default. Since React runs on `localhost:5173` and FastAPI on `localhost:5000`, we need CORS middleware to allow it.

### Data Storage

Instead of a database, we use a simple JSON file:

```python
def read_data():
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def write_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
```

### Pydantic Models — Request Validation

```python
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    status: str = Field(default="Pending")
    priority: str = Field(default="Medium")
```

FastAPI automatically validates incoming data against these models. If validation fails, it returns a `422 Unprocessable Entity` error.

### API Endpoints Summary

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| `POST` | `/api/auth/register` | `{ name, email, password }` | User object |
| `POST` | `/api/auth/login` | `{ email, password }` | User object |
| `GET` | `/api/tasks/{user_id}` | — | Array of tasks |
| `POST` | `/api/tasks?user_id=xxx` | `{ title, description, status, priority }` | Created task |
| `PUT` | `/api/tasks/{task_id}` | `{ title?, description?, status?, priority? }` | Updated task |
| `DELETE` | `/api/tasks/{task_id}` | — | Deleted task |

### Error Handling

```python
from fastapi import HTTPException

# Raise an HTTP error
raise HTTPException(status_code=400, detail="Email already registered")
raise HTTPException(status_code=401, detail="Invalid email or password")
raise HTTPException(status_code=404, detail="Task not found")
```

---

## 13. File-by-File Code Walkthrough

### `main.jsx` — Entry Point

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
```

- Finds the `<div id="root">` in `index.html`
- Renders the `<App />` component into it
- `StrictMode` enables extra development warnings

### `App.jsx` — Root Component

**Responsibilities:**
1. Sets up MUI theme (font, colors, border radius)
2. Wraps everything in `<ThemeProvider>` and `<Router>`
3. Provides `AuthProvider` for global auth state
4. Defines all routes

**Key pattern — auth-aware routing:**
```jsx
<Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
```
If already logged in, redirect away from login page.

### `AuthContext.jsx` — Authentication State

**Provides:** `user`, `login()`, `register()`, `logout()`, `loading`

**Flow:**
1. On mount → check `localStorage` for saved user
2. On login → POST to API → save user to state + `localStorage`
3. On logout → clear state + `localStorage`

### `Navbar.jsx` — Navigation

**Features:**
- Responsive: desktop shows buttons, mobile shows hamburger menu + drawer
- Active link highlighting using `useLocation()`
- User avatar with initials
- Logout button

### `ProtectedRoute.jsx` — Auth Guard

Wraps routes that require login. Shows spinner while loading, redirects to `/login` if not authenticated.

### `Home.jsx` — Dashboard

**Features:**
- Welcome message with user's name
- 4 stat cards (total, completed, in-progress, pending)
- Recent tasks list (latest 5)
- Task summary with completion progress bar
- Staggered animations on cards

### `Tasks.jsx` — Task Management

**This is the most complex component (~475 lines).**

**State management:**
- `tasks` — array of all tasks
- `openDialog` — controls create/edit modal
- `editingTask` — `null` for create, task object for edit
- `formData` — form field values
- `formErrors` — validation error messages
- `searchQuery`, `statusFilter`, `priorityFilter` — filter controls
- `snackbar` — toast notification state
- `deleteDialog` — delete confirmation modal

**Key patterns:**
- Shared dialog for create AND edit (controlled by `editingTask`)
- Client-side filtering with `.filter()` and multiple conditions
- Confirmation dialog before destructive actions (delete)
- Snackbar notifications for user feedback

### `server/main.py` — Backend

**Structure:**
1. FastAPI app setup + CORS
2. JSON file read/write helpers
3. Pydantic models for validation
4. Auth endpoints (register, login)
5. Task CRUD endpoints
6. Input validation (status/priority values)

---

## 14. How to Run the Project

### Prerequisites

- **Node.js** (v18 or later) — [nodejs.org](https://nodejs.org)
- **Python** (v3.8 or later) — [python.org](https://python.org)

### Step 1: Install Frontend Dependencies

```bash
cd taskflow
npm install
```

### Step 2: Install Backend Dependencies

```bash
cd server
pip install fastapi uvicorn pydantic
```

### Step 3: Start the Backend

```bash
# From the server/ directory
python -m uvicorn main:app --reload --port 5000
```

The API will be running at `http://localhost:5000`. You can see the auto-generated docs at `http://localhost:5000/docs`.

### Step 4: Start the Frontend

```bash
# From the taskflow/ root directory (new terminal)
npm run dev
```

The app will be running at `http://localhost:5173`.

### Step 5: Use the App

1. Open `http://localhost:5173` in your browser
2. Register a new account
3. Login with your credentials
4. Create, edit, and manage your tasks!

---

## 15. Common Interview Questions

### React Questions

**Q: What is the Virtual DOM?**
A: React creates a lightweight copy of the real DOM in memory. When state changes, React compares the new virtual DOM with the old one (called "diffing"), and only updates the parts of the real DOM that changed. This makes updates very fast.

**Q: What is the difference between `state` and `props`?**
A: State is data managed *within* a component (can change). Props are data passed *to* a component from its parent (read-only). In TaskFlow, `tasks` is state in `Tasks.jsx`, while `children` is a prop in `ProtectedRoute`.

**Q: What is `useEffect` used for?**
A: `useEffect` runs side effects — code that interacts with things outside the component, like API calls, timers, or localStorage. In TaskFlow, we use it to fetch tasks when the component mounts.

**Q: What is Context API?**
A: Context provides a way to pass data through the component tree without passing props down manually at every level. In TaskFlow, `AuthContext` shares the logged-in user data with all components.

**Q: What are controlled components?**
A: Form inputs whose values are controlled by React state. In TaskFlow, all form fields use `value={formData.xxx}` and `onChange={handleChange}` — React is the "single source of truth" for the input value.

### API/Backend Questions

**Q: What is a REST API?**
A: REST (Representational State Transfer) is an architectural style for APIs. It uses HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations on resources (like tasks) identified by URLs.

**Q: What is CORS?**
A: Cross-Origin Resource Sharing is a security feature. Browsers block requests from one origin (domain:port) to another. We configure CORS middleware on the server to explicitly allow our React frontend to make API calls.

**Q: What are HTTP status codes?**
A: 200 = OK, 201 = Created, 400 = Bad Request, 401 = Unauthorized, 404 = Not Found, 422 = Validation Error, 500 = Server Error.

### General Questions

**Q: What is client-side routing?**
A: Instead of the server handling navigation (sending new HTML pages), JavaScript in the browser changes the URL and renders different components. React Router handles this in TaskFlow — the page never fully reloads.

**Q: How does authentication work in this app?**
A: Simple session-based auth using localStorage. On login, the server returns user data, which is stored in React state and localStorage. On page refresh, the app checks localStorage. On logout, both are cleared. (Note: In production, you'd use JWT tokens or session cookies for security.)

**Q: What is form validation?**
A: Checking user input before sending it to the server. We validate on the client side (instant feedback) and the server side (security). Client-side checks include: required fields, email format (regex), minimum length, and password matching.

---

## Quick Reference — Key Code Patterns

```jsx
// State management
const [value, setValue] = useState(initial);

// API call with error handling
try {
    const response = await axios.get(url);
    setData(response.data);
} catch (error) {
    setError(error.response?.data?.detail || 'Failed');
}

// Conditional rendering
{condition ? <ComponentA /> : <ComponentB />}
{condition && <Component />}

// List rendering
{items.map(item => <Component key={item.id} data={item} />)}

// Form handling
<TextField value={formData.field} onChange={handleChange} name="field" />

// Array updates (immutable)
setItems([...items, newItem]);                           // Add
setItems(items.map(i => i.id === id ? updated : i));     // Update
setItems(items.filter(i => i.id !== id));                // Delete

// Navigation
const navigate = useNavigate();
navigate('/path');
```

---

> 💡 **Tip:** The best way to learn is to modify the code! Try adding a new field (like "due date") to tasks, or adding a "dark mode" toggle. You'll learn so much more by building on top of what's already here.

Happy coding! 🚀
