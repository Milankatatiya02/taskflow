import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Box, Card, CardContent, Typography, TextField,
    Button, Alert, InputAdornment, IconButton, CircularProgress, useMediaQuery, useTheme
} from '@mui/material';
import {
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    Login as LoginIcon
} from '@mui/icons-material';

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Validation
    const validate = () => {
        const newErrors = {};
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Enter a valid email address';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user types
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
        setServerError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        const result = await login(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            navigate('/');
        } else {
            setServerError(result.message);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: { xs: 2, sm: 3 }
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <Card
                    sx={{
                        maxWidth: { xs: '100%', sm: 420 },
                        width: '100%',
                        borderRadius: { xs: 2, sm: 4 },
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    }}
                >
                    <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Typography variant={{ xs: 'h5', sm: 'h4' }} fontWeight={700} color="#6C63FF" gutterBottom>
                                    📋 TaskFlow
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                    Welcome back! Sign in to continue.
                                </Typography>
                            </Box>
                        </motion.div>

                        {serverError && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                    {serverError}
                                </Alert>
                            </motion.div>
                        )}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={!!errors.email}
                                    helperText={errors.email}
                                    margin="normal"
                                    size="small"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon sx={{ color: '#999' }} />
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            transition: 'all 0.3s ease',
                                            '&:focus-within': {
                                                transform: 'translateY(-2px)',
                                            }
                                        }
                                    }}
                                />
                            </motion.div>

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                                <TextField
                                    fullWidth
                                    label="Password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    margin="normal"
                                    size="small"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon sx={{ color: '#999' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            transition: 'all 0.3s ease',
                                            '&:focus-within': {
                                                transform: 'translateY(-2px)',
                                            }
                                        }
                                    }}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                                    sx={{
                                        mt: 3,
                                        mb: 2,
                                        py: { xs: 1.2, sm: 1.5 },
                                        bgcolor: '#6C63FF',
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontSize: { xs: 14, sm: 16 },
                                        fontWeight: 600,
                                        boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            bgcolor: '#5A52E0',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 6px 20px rgba(108, 99, 255, 0.4)'
                                        }
                                    }}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </motion.div>

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                                <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                                    Don't have an account?{' '}
                                    <Link to="/register" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none' }}>
                                        Sign Up
                                    </Link>
                                </Typography>
                            </motion.div>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
}

export default Login;
