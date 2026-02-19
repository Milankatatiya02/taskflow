import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    Chip,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Menu as MenuIcon,
    Home as HomeIcon,
    Assignment as TaskIcon,
    Info as InfoIcon,
    ContactMail as ContactIcon,
    Person as PersonIcon,
    Logout as LogoutIcon
} from '@mui/icons-material';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [drawerOpen, setDrawerOpen] = useState(false);

    if (!user) return null;

    const navItems = [
        { label: 'Home', path: '/', icon: <HomeIcon /> },
        { label: 'Tasks', path: '/tasks', icon: <TaskIcon /> },
        { label: 'About Us', path: '/aboutus', icon: <InfoIcon /> },
        { label: 'Contact Us', path: '/contactus', icon: <ContactIcon /> }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const drawer = (
        <Box sx={{ width: 250, pt: 2 }}>
            <Box 
                onClick={() => { navigate('/profile'); setDrawerOpen(false); }}
                sx={{ 
                    px: 2, 
                    pb: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        bgcolor: 'rgba(108, 99, 255, 0.08)',
                    }
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
                                    '& .MuiListItemIcon-root': { color: '#6C63FF' }
                                }
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} />
                        </ListItemButton>
                    </ListItem>
                ))}
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
                    bgcolor: '#fff',
                    color: '#333',
                    borderBottom: '1px solid #e0e0e0',
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
                        to="/"
                        sx={{
                            fontWeight: 700,
                            textDecoration: 'none',
                            color: '#6C63FF',
                            letterSpacing: '-0.5px',
                            flexGrow: isMobile ? 1 : 0,
                            mr: 4
                        }}
                    >
                        📋 TaskFlow
                    </Typography>

                    {!isMobile && (
                        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    startIcon={item.icon}
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        color: location.pathname === item.path ? '#6C63FF' : '#666',
                                        fontWeight: location.pathname === item.path ? 600 : 400,
                                        bgcolor: location.pathname === item.path ? 'rgba(108, 99, 255, 0.08)' : 'transparent',
                                        borderRadius: 2,
                                        px: 2,
                                        textTransform: 'none',
                                        '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.05)' }
                                    }}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Box>
                    )}

                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip
                                avatar={<Avatar sx={{ bgcolor: '#6C63FF', width: 28, height: 28, fontSize: 12 }}>{getInitials(user.name)}</Avatar>}
                                label={user.name}
                                onClick={() => navigate('/profile')}
                                variant="outlined"
                                sx={{
                                    borderColor: '#e0e0e0',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#6C63FF',
                                        bgcolor: 'rgba(108, 99, 255, 0.05)',
                                    }
                                }}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<LogoutIcon />}
                                onClick={handleLogout}
                                sx={{
                                    color: '#999',
                                    borderColor: '#e0e0e0',
                                    textTransform: 'none',
                                    '&:hover': { borderColor: '#f44336', color: '#f44336' }
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
