import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { userAPI, taskAPI, handleAPIError } from '../services/api';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    Avatar,
    Button,
    TextField,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Snackbar,
    CircularProgress,
    Chip,
    useMediaQuery,
    useTheme,
    Tab,
    Tabs
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Settings as SettingsIcon,
    Security as SecurityIcon,
    Notifications as NotificationsIcon,
} from '@mui/icons-material';

function Profile() {
    const { user, updateUser } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tabValue, setTabValue] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
    const [stats, setStats] = useState([
        { label: 'Total Tasks', value: '0', color: '#6C63FF' },
        { label: 'Completed', value: '0', color: '#4CAF50' },
        { label: 'In Progress', value: '0', color: '#FF9800' },
        { label: 'Pending', value: '0', color: '#F44336' },
    ]);
    const [passwordError, setPasswordError] = useState('');
    const [editError, setEditError] = useState('');

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
    });

    const [originalData, setOriginalData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Initialize with proper default values to avoid controlled/uncontrolled component warning
    const [preferences, setPreferences] = useState({
        emailNotifications: true,
        pushNotifications: true,
        taskReminders: true,
        weeklyReport: true,
        twoFactor: false,
        darkMode: mode === 'dark',
    });

    const blurActiveElement = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    useEffect(() => {
        fetchUserStats();
        fetchUserPreferences();
    }, [user?.id]);

    useEffect(() => {
        setPreferences((prev) => ({ ...prev, darkMode: mode === 'dark' }));
    }, [mode]);

    const fetchUserStats = async () => {
        try {
          const response = await taskAPI.getAllTasks();
          const tasks = response.data || [];
          const completed = tasks.filter(t => t.status === 'Completed').length;
          const inProgress = tasks.filter(t => t.status === 'In Progress').length;
          const pending = tasks.filter(t => t.status === 'Pending').length;
          
          setStats([
            { label: 'Total Tasks', value: tasks.length.toString(), color: '#6C63FF' },
            { label: 'Completed', value: completed.toString(), color: '#4CAF50' },
            { label: 'In Progress', value: inProgress.toString(), color: '#FF9800' },
            { label: 'Pending', value: pending.toString(), color: '#F44336' },
          ]);
        } catch (error) {
          const err = handleAPIError(error);
          console.log('Using default stats:', err.message);
          // Keep default stats on error
        }
    };

    const fetchUserPreferences = async () => {
        try {
          const response = await userAPI.getPreferences();
          if (response.data) {
            setPreferences(prev => ({ ...prev, ...response.data }));
          }
        } catch (error) {
          const err = handleAPIError(error);
          console.log('Using default preferences:', err.message);
          // Keep default preferences on error
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
        setEditError('');
    };

    const handlePreferenceChange = async (key) => {
        if (key === 'darkMode') {
            toggleMode();
            setPreferences(prev => ({ ...prev, darkMode: mode !== 'dark' }));
            return;
        }

        const updatedPrefs = { ...preferences, [key]: !preferences[key] };
        setPreferences(updatedPrefs);
        
        try {
          await userAPI.updatePreferences(updatedPrefs);
          setSnackbar({ 
            open: true, 
            message: 'Preferences updated successfully', 
            type: 'success' 
          });
        } catch (error) {
          const err = handleAPIError(error);
          console.log('Preferences updated locally:', err.message);
          // Update locally even if API fails
          setSnackbar({ 
            open: true, 
            message: 'Preferences updated locally', 
            type: 'info' 
          });
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const handleSaveProfile = async () => {
        setEditError('');
        
        if (!profileData.name.trim()) {
            setEditError('Name cannot be empty');
            return;
        }
        
        if (!profileData.email.trim()) {
            setEditError('Email cannot be empty');
            return;
        }

        setLoading(true);
        try {
          const response = await userAPI.updateProfile(profileData);
          updateUser(response.data);
          setOriginalData(profileData);
          setIsEditing(false);
          setSnackbar({ 
            open: true, 
            message: 'Profile updated successfully', 
            type: 'success' 
          });
        } catch (error) {
          const err = handleAPIError(error);
          setEditError(err.message);
          setSnackbar({ 
            open: true, 
            message: err.message, 
            type: 'error' 
          });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        setPasswordError('');
        
        if (!passwordData.currentPassword) {
            setPasswordError('Current password is required');
            return;
        }
        
        if (!passwordData.newPassword) {
            setPasswordError('New password is required');
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
          await userAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setShowChangePassword(false);
          setSnackbar({ 
            open: true, 
            message: 'Password changed successfully', 
            type: 'success' 
          });
        } catch (error) {
          const err = handleAPIError(error);
          setPasswordError(err.message);
          setSnackbar({ 
            open: true, 
            message: err.message, 
            type: 'error' 
          });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setProfileData(originalData);
        setIsEditing(false);
        setEditError('');
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <Box sx={{ py: { xs: 4, md: 8 }, bgcolor: 'transparent', minHeight: '100vh' }}>
            <Container maxWidth="lg">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant={{ xs: 'h4', md: 'h3' }} fontWeight={700}>
                            My Profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage your account and preferences
                        </Typography>
                    </Box>
                </motion.div>

                {/* Profile Card */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: { xs: 2, md: 3 } }}>
                            <Grid container spacing={3} alignItems="flex-start">
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                                        <Avatar
                                            sx={{
                                                width: { xs: 80, md: 100 },
                                                height: { xs: 80, md: 100 },
                                                bgcolor: '#6C63FF',
                                                fontSize: { xs: 32, md: 40 },
                                                fontWeight: 700,
                                                mx: { xs: 'auto', md: 0 },
                                                mb: 2,
                                            }}
                                        >
                                            {getInitials(profileData.name)}
                                        </Avatar>
                                        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                            {profileData.name}
                                        </Typography>
                                        <Chip label="Member" size="small" sx={{ bgcolor: '#6C63FF15', color: '#6C63FF', fontWeight: 600 }} />
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 12, md: 9 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                        <Typography variant="h6" fontWeight={700}>
                                            Account Information
                                        </Typography>
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
                                                    onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                                                    variant={isEditing ? 'outlined' : 'contained'}
                                                    size="small"
                                                    sx={{
                                                    bgcolor: isEditing ? 'transparent' : 'primary.main',
                                                    color: isEditing ? 'error.main' : 'primary.contrastText',
                                                    borderColor: isEditing ? 'error.main' : 'transparent',
                                                    }}
                                                >
                                                    {isEditing ? 'Cancel' : 'Edit'}
                                            </Button>
                                        </motion.div>
                                    </Box>

                                    {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}

                                    <Grid container spacing={2}>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="Full Name"
                                                name="name"
                                                value={profileData.name}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                variant={isEditing ? 'outlined' : 'standard'}
                                                size="small"
                                                error={editError && !profileData.name.trim()}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                name="email"
                                                type="email"
                                                value={profileData.email}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                variant={isEditing ? 'outlined' : 'standard'}
                                                size="small"
                                                error={editError && !profileData.email.trim()}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="Phone"
                                                name="phone"
                                                value={profileData.phone}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                variant={isEditing ? 'outlined' : 'standard'}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                            <TextField
                                                fullWidth
                                                label="Bio"
                                                name="bio"
                                                value={profileData.bio}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                variant={isEditing ? 'outlined' : 'standard'}
                                                size="small"
                                            />
                                        </Grid>
                                    </Grid>

                                    {isEditing && (
                                        <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                                                    onClick={handleSaveProfile}
                                                    disabled={loading}
                                                    variant="contained"
                                                    sx={{ bgcolor: 'success.main' }}
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </motion.div>
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>
                        </Paper>
                    </motion.div>

                    {/* Stats Cards */}
                    <motion.div variants={itemVariants}>
                        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
                            {stats.map((stat, index) => (
                                <Grid size={{ xs: 6, md: 3 }} key={index}>
                                    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.3 }}>
                                        <Card sx={{
                                            textAlign: 'center',
                                            borderRadius: { xs: 2, md: 3 },
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                transform: 'translateY(-4px)',
                                            }
                                        }}>
                                            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                                <Typography variant="h4" fontWeight={700} sx={{ color: stat.color, mb: 1 }}>
                                                    {stat.value}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                                    {stat.label}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>

                    {/* Tabs Section */}
                    <motion.div variants={itemVariants}>
                        <Paper sx={{ borderRadius: { xs: 2, md: 3 }, overflow: 'hidden' }}>
                            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                                <Tab icon={<SettingsIcon />} label="Preferences" />
                                <Tab icon={<SecurityIcon />} label="Security" />
                                <Tab icon={<NotificationsIcon />} label="Notifications" />
                            </Tabs>

                            <Box sx={{ p: { xs: 2, md: 4 } }}>
                                {/* Preferences Tab */}
                                {tabValue === 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                                        <Box>
                                            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                                                Display Settings
                                            </Typography>
                                            {[
                                                { key: 'darkMode', label: 'Dark Mode', desc: 'Use dark theme for the application' },
                                            ].map((item) => (
                                                <Box key={item.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={item.key === 'darkMode' ? mode === 'dark' : preferences[item.key]}
                                                        onChange={() => handlePreferenceChange(item.key)}
                                                        sx={{ color: '#6C63FF' }}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    </motion.div>
                                )}

                                {/* Security Tab */}
                                {tabValue === 1 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                                        <Box>
                                            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                                                Security Options
                                            </Typography>

                                            <Box sx={{ mb: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>Two-Factor Authentication</Typography>
                                                        <Typography variant="caption" color="text.secondary">Add an extra layer of security</Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={preferences.twoFactor}
                                                        onChange={() => handlePreferenceChange('twoFactor')}
                                                        sx={{ color: '#6C63FF' }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Button
                                                variant="outlined"
                                                onClick={() => {
                                                    blurActiveElement();
                                                    setShowChangePassword(true);
                                                }}
                                                fullWidth
                                                sx={{ color: '#6C63FF', borderColor: '#6C63FF', textTransform: 'none' }}
                                            >
                                                Change Password
                                            </Button>

                                            <Alert severity="info" sx={{ mt: 3 }}>
                                                Account created: {profileData.joinDate}
                                            </Alert>
                                        </Box>
                                    </motion.div>
                                )}

                                {/* Notifications Tab */}
                                {tabValue === 2 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                                        <Box>
                                            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
                                                Notification Preferences
                                            </Typography>
                                            {[
                                                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates about tasks' },
                                                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get browser notifications' },
                                                { key: 'taskReminders', label: 'Task Reminders', desc: 'Get reminded about upcoming tasks' },
                                                { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive weekly summary of your tasks' },
                                            ].map((item) => (
                                                <Box key={item.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                                                    </Box>
                                                    <Switch
                                                        checked={preferences[item.key]}
                                                        onChange={() => handlePreferenceChange(item.key)}
                                                        sx={{ color: '#6C63FF' }}
                                                    />
                                                </Box>
                                            ))}
                                        </Box>
                                    </motion.div>
                                )}
                            </Box>
                        </Paper>
                    </motion.div>
                </motion.div>

                {/* Change Password Dialog */}
                <Dialog open={showChangePassword} onClose={() => setShowChangePassword(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
                        <TextField
                            fullWidth
                            label="Current Password"
                            name="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            sx={{ mb: 2 }}
                            disabled={loading}
                        />
                        <TextField
                            fullWidth
                            label="New Password"
                            name="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            sx={{ mb: 2 }}
                            disabled={loading}
                            helperText="Must be at least 6 characters"
                        />
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            disabled={loading}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowChangePassword(false)} disabled={loading}>Cancel</Button>
                        <Button 
                            variant="contained" 
                            sx={{ bgcolor: '#6C63FF' }}
                            onClick={handleUpdatePassword}
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert 
                        onClose={() => setSnackbar({ ...snackbar, open: false })} 
                        severity={snackbar.type}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </Box>
    );
}

export default Profile;
