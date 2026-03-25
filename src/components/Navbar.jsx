import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { notificationAPI } from '../services/api';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Badge,
    Chip,
    Tooltip,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Assignment as TaskIcon,
    Folder as ProjectIcon,
    Notifications as NotifIcon,
    Info as InfoIcon,
    ContactMail as ContactIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';

function Navbar() {
    const { user, logout } = useAuth();
    const { mode, toggleMode } = useThemeMode();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchCount = async () => {
            try {
                const res = await notificationAPI.getUnreadCount();
                setUnreadCount(res.data.count || 0);
            } catch {
                // silent
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [user]);

    if (!user) {
        // Show minimal navbar for public pages
        const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
        if (location.pathname === '/') return null; // Landing has its own nav-like elements

        return (
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backdropFilter: 'blur(8px)',
                }}
            >
                <Toolbar>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{ fontWeight: 700, textDecoration: 'none', color: '#6C63FF', letterSpacing: '-0.5px', flexGrow: 1 }}
                    >
                        TaskFlow
                    </Typography>
                    <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
                        <IconButton onClick={toggleMode} size="small" sx={{ mr: 1 }}>
                            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                        </IconButton>
                    </Tooltip>
                    {!isAuthPage && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button component={Link} to="/login" variant="outlined" size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>Sign In</Button>
                            <Button component={Link} to="/register" variant="contained" size="small" sx={{ textTransform: 'none', borderRadius: 2 }}>Sign Up</Button>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>
        );
    }

    const navItems = [
        { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
        { label: 'Tasks', path: '/tasks', icon: <TaskIcon /> },
        { label: 'Projects', path: '/projects', icon: <ProjectIcon /> },
        { label: 'About', path: '/aboutus', icon: <InfoIcon /> },
        { label: 'Contact', path: '/contactus', icon: <ContactIcon /> },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const drawer = (
        <Box sx={{ width: 260, pt: 2 }}>
            <Box
                onClick={() => { navigate('/profile'); setDrawerOpen(false); }}
                sx={{
                    px: 2, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                    cursor: 'pointer', borderRadius: 1, transition: 'all 0.3s',
                    '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.08)' },
                }}
            >
                <Avatar sx={{ bgcolor: '#6C63FF', width: 36, height: 36, fontSize: 14 }}>
                    {getInitials(user.name)}
                </Avatar>
                <Typography variant="subtitle1" fontWeight={600}>{user.name}</Typography>
            </Box>
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.label} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(108, 99, 255, 0.08)',
                                    color: '#6C63FF',
                                    '& .MuiListItemIcon-root': { color: '#6C63FF' },
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
                <ListItem disablePadding>
                    <ListItemButton
                        selected={location.pathname === '/notifications'}
                        onClick={() => { navigate('/notifications'); setDrawerOpen(false); }}
                        sx={{
                            '&.Mui-selected': {
                                bgcolor: 'rgba(108, 99, 255, 0.08)',
                                color: '#6C63FF',
                                '& .MuiListItemIcon-root': { color: '#6C63FF' },
                            },
                        }}
                    >
                        <ListItemIcon>
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                <NotifIcon />
                            </Badge>
                        </ListItemIcon>
                        <ListItemText primary="Notifications" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={toggleMode}>
                        <ListItemIcon>{mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}</ListItemIcon>
                        <ListItemText primary={mode === 'light' ? 'Dark Mode' : 'Light Mode'} />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backdropFilter: 'blur(8px)',
                }}
            >
                <Toolbar>
                    {isMobile && (
                        <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography
                        variant="h6"
                        component={Link}
                        to="/dashboard"
                        sx={{
                            fontWeight: 700,
                            textDecoration: 'none',
                            color: '#6C63FF',
                            letterSpacing: '-0.5px',
                            mr: 3,
                        }}
                    >
                        TaskFlow
                    </Typography>

                    {!isMobile && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    startIcon={item.icon}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        color: location.pathname === item.path ? '#6C63FF' : 'text.secondary',
                                        fontWeight: location.pathname === item.path ? 600 : 400,
                                        bgcolor: location.pathname === item.path ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                        borderRadius: 2,
                                        px: 1.5,
                                        textTransform: 'none',
                                        fontSize: '0.85rem',
                                        '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.05)' },
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Box>
                    )}

                    {/* Notification Bell */}
                    <Tooltip title="Notifications">
                        <IconButton onClick={() => navigate('/notifications')} sx={{ mr: 1 }}>
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                <NotifIcon color={location.pathname === '/notifications' ? 'primary' : 'action'} />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
                        <IconButton onClick={toggleMode} color="inherit" size="small" sx={{ mr: 1 }}>
                            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                        </IconButton>
                    </Tooltip>

                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Chip
                                avatar={<Avatar sx={{ bgcolor: '#6C63FF', width: 28, height: 28, fontSize: 12 }}>{getInitials(user.name)}</Avatar>}
                                label={user.name}
                                onClick={() => navigate('/profile')}
                                variant="outlined"
                                sx={{
                                    borderColor: 'divider',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    '&:hover': { borderColor: '#6C63FF', bgcolor: 'rgba(108, 99, 255, 0.05)' },
                                }}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<LogoutIcon />}
                                onClick={handleLogout}
                                sx={{
                                    color: 'text.secondary',
                                    borderColor: 'divider',
                                    textTransform: 'none',
                                    '&:hover': { borderColor: '#f44336', color: '#f44336' },
                                }}
                            >
                                Logout
                            </Button>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                {drawer}
            </Drawer>
        </>
    );
}

export default Navbar;
