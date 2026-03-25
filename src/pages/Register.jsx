import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Box, Card, CardContent, Typography, TextField,
    Button, Alert, InputAdornment, IconButton, CircularProgress, useTheme
} from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Visibility,
    VisibilityOff,
    HowToReg as RegisterIcon
} from '@mui/icons-material';

function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }
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
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
        setServerError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        const result = await register(formData.name, formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            navigate('/dashboard');
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
                background: isDark
                    ? 'linear-gradient(135deg, #171b31 0%, #11162b 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                        bgcolor: 'background.paper',
                        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.45)' : '0 20px 60px rgba(0,0,0,0.15)',
                    }}
                >
                    <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant={{ xs: 'h5', sm: 'h4' }} fontWeight={700} color="primary.main" gutterBottom>
                                TaskFlow
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                Create your account to get started.
                            </Typography>
                        </Box>

                        {serverError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{serverError}</Alert>}

                        <Box component="form" onSubmit={handleSubmit} noValidate>
                            <TextField
                                fullWidth
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                error={!!errors.name}
                                helperText={errors.name}
                                margin="normal"
                                size="small"
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><PersonIcon sx={{ color: 'text.secondary' }} /></InputAdornment>)
                                }}
                            />

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
                                    startAdornment: (<InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary' }} /></InputAdornment>)
                                }}
                            />

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
                                    startAdornment: (<InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary' }} /></InputAdornment>),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Confirm Password"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword}
                                margin="normal"
                                size="small"
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary' }} /></InputAdornment>)
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <RegisterIcon />}
                                sx={{ mt: 3, mb: 2, py: { xs: 1.2, sm: 1.5 }, textTransform: 'none', fontWeight: 600 }}
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </Button>

                            <Typography variant="body2" textAlign="center" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                                Already have an account?{' '}
                                <Link to="/login" style={{ color: theme.palette.primary.main, fontWeight: 600, textDecoration: 'none' }}>
                                    Sign In
                                </Link>
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
}

export default Register;
