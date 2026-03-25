import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { LockReset as ResetIcon, Email as EmailIcon, ArrowBack as BackIcon } from '@mui/icons-material';

export default function ForgotPassword() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setMessage('If an account exists with this email, a reset link has been sent. Check your inbox.');
      setSent(true);
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(resetToken, newPassword);
      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const isResetMode = Boolean(resetToken);

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: 440 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #6C63FF, #8b5cf6)',
            }}>
              {isResetMode ? <ResetIcon sx={{ color: '#fff', fontSize: 32 }} /> : <EmailIcon sx={{ color: '#fff', fontSize: 32 }} />}
            </Box>
            <Typography variant="h5" fontWeight={800}>
              {isResetMode ? 'Reset Password' : 'Forgot Password'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isResetMode ? 'Enter your new password' : 'Enter your email to receive a reset link'}
            </Typography>
          </Box>

          {message && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {!isResetMode ? (
            <form onSubmit={handleForgot}>
              <TextField
                fullWidth label="Email Address" type="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={sent} sx={{ mb: 2 }}
              />
              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading || sent}
                sx={{ borderRadius: 2, py: 1.3, fontWeight: 700 }}
              >
                {loading ? 'Sending...' : sent ? 'Email Sent' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset}>
              <TextField
                fullWidth label="New Password" type="password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth label="Confirm Password" type="password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading}
                sx={{ borderRadius: 2, py: 1.3, fontWeight: 700 }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button component={Link} to="/login" startIcon={<BackIcon />} size="small" color="inherit">
              Back to Login
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
