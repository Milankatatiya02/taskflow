import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Tasks from './pages/Tasks';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Profile from './pages/Profile';

// Wrapper to handle auth redirects
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/aboutus" element={<ProtectedRoute><AboutUs /></ProtectedRoute>} />
        <Route path="/contactus" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function ThemedApp() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const theme = createTheme({
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    shape: {
      borderRadius: 10,
    },
    palette: {
      mode,
      primary: {
        main: '#6C63FF',
      },
      secondary: {
        main: '#14B8A6',
      },
      background: {
        default: isDark ? '#0f1222' : '#f4f6ff',
        paper: isDark ? '#171b31' : '#ffffff',
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background: isDark
              ? 'radial-gradient(circle at 10% 20%, #1c2140 0%, #0f1222 40%, #0b0e1a 100%)'
              : 'radial-gradient(circle at 0% 0%, #eef1ff 0%, #f8f9ff 50%, #f4f6ff 100%)',
          },
        }}
      />
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}

export default App;
