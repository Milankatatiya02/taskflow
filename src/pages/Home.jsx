import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Paper,
    List, ListItem, ListItemText, ListItemIcon, Divider, Button, useMediaQuery, useTheme
} from '@mui/material';
import {
    Assignment as TaskIcon,
    CheckCircle as CompletedIcon,
    HourglassEmpty as PendingIcon,
    TrendingUp as ProgressIcon,
    ArrowForward as ArrowIcon,
    Circle as CircleIcon
} from '@mui/icons-material';

function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await taskAPI.getAllTasks();
            setTasks(response.data || []);
        } catch (error) {
            const err = handleAPIError(error);
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const stats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        pending: tasks.filter(t => t.status === 'Pending').length,
    };

    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    const statCards = [
        { label: 'Total Tasks', value: stats.total, icon: <TaskIcon />, color: '#6C63FF', bg: 'rgba(108,99,255,0.08)' },
        { label: 'Completed', value: stats.completed, icon: <CompletedIcon />, color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
        { label: 'In Progress', value: stats.inProgress, icon: <ProgressIcon />, color: '#FF9800', bg: 'rgba(255,152,0,0.08)' },
        { label: 'Pending', value: stats.pending, icon: <PendingIcon />, color: '#F44336', bg: 'rgba(244,67,54,0.08)' },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'warning';
            case 'Pending': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return '#F44336';
            case 'Medium': return '#FF9800';
            case 'Low': return '#4CAF50';
            default: return '#999';
        }
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
            {/* Welcome Section */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant={{ xs: 'h5', sm: 'h4', md: 'h4' }} fontWeight={700} gutterBottom>
                        Welcome back, {user.name}! 👋
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                        Here's an overview of your tasks.
                    </Typography>
                </Box>
            </motion.div>

            {/* Stats Cards */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 4 }}>
                {statCards.map((stat, index) => (
                    <Grid size={{ xs: 6, sm: 6, md: 3 }} key={stat.label}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Card
                                sx={{
                                    borderRadius: { xs: 2, md: 3 },
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    height: '100%',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: '0 12px 28px rgba(108,99,255,0.15)'
                                    }
                                }}
                            >
                                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Box
                                            sx={{
                                                width: { xs: 40, md: 44 }, height: { xs: 40, md: 44 }, borderRadius: 2.5,
                                                bgcolor: stat.bg, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                color: stat.color
                                            }}
                                        >
                                            {stat.icon}
                                        </Box>
                                    </Box>
                                    <Typography variant={{ xs: 'h5', md: 'h3' }} fontWeight={700} color={stat.color}>
                                        {stat.value}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                        {stat.label}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            {/* Recent Tasks & Quick Actions */}
            <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <Paper
                            sx={{
                                borderRadius: { xs: 2, md: 3 },
                                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                            }}
                        >
                            <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant={{ xs: 'subtitle1', md: 'h6' }} fontWeight={600}>Recent Tasks</Typography>
                                <Button
                                    endIcon={<ArrowIcon />}
                                    onClick={() => navigate('/tasks')}
                                    sx={{ textTransform: 'none', color: '#6C63FF', fontSize: { xs: '0.8rem', sm: '1rem' } }}
                                >
                                    View All
                                </Button>
                            </Box>
                            <Divider />
                            {recentTasks.length === 0 ? (
                                <Box sx={{ p: { xs: 2, md: 4 }, textAlign: 'center' }}>
                                    <Typography color="text.secondary" variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>No tasks yet. Create your first task!</Typography>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate('/tasks')}
                                        sx={{ mt: 2, bgcolor: '#6C63FF', textTransform: 'none', fontSize: { xs: '0.8rem', sm: '1rem' }, '&:hover': { bgcolor: '#5A52E0' } }}
                                    >
                                        Go to Tasks
                                    </Button>
                                </Box>
                            ) : (
                                <List sx={{ p: 0 }}>
                                    {recentTasks.map((task, index) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + index * 0.05 }}
                                        >
                                            <ListItem
                                                sx={{
                                                    px: { xs: 2, md: 3 }, py: 1.5,
                                                    borderBottom: index < recentTasks.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                    transition: 'background 0.2s',
                                                    '&:hover': { bgcolor: '#fafafa' }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <CircleIcon sx={{ fontSize: 10, color: getPriorityColor(task.priority) }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{task.title}</Typography>
                                                    }
                                                    secondary={
                                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' } }}>
                                                            {task.description.length > 60 ? task.description.slice(0, 60) + '...' : task.description}
                                                        </Typography>
                                                    }
                                                />
                                                <Chip
                                                    label={task.status}
                                                    color={getStatusColor(task.status)}
                                                    size="small"
                                                    sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                                    variant="outlined"
                                                />
                                            </ListItem>
                                        </motion.div>
                                    ))}
                                </List>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <Paper
                            sx={{
                                borderRadius: { xs: 2, md: 3 },
                                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                p: { xs: 2, md: 3 },
                            }}
                        >
                            <Typography variant={{ xs: 'subtitle1', md: 'h6' }} fontWeight={600} gutterBottom>
                                Task Summary
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            {stats.total === 0 ? (
                                <Typography color="text.secondary" variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                    No tasks to summarize. Start by adding tasks!
                                </Typography>
                            ) : (
                                <Box>
                                    {/* Progress bar for completion */}
                                    <Box sx={{ mb: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Completion Rate</Typography>
                                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                                            </Typography>
                                        </Box>
                                        <Box sx={{ height: 8, bgcolor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                style={{
                                                    height: '100%',
                                                    backgroundColor: '#4CAF50',
                                                    borderRadius: '4px'
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Status breakdown */}
                                    {[
                                        { label: 'Pending', count: stats.pending, color: '#F44336' },
                                        { label: 'In Progress', count: stats.inProgress, color: '#FF9800' },
                                        { label: 'Completed', count: stats.completed, color: '#4CAF50' },
                                    ].map((item, idx) => (
                                        <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircleIcon sx={{ fontSize: 10, color: item.color }} />
                                                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{item.label}</Typography>
                                            </Box>
                                            <Chip label={item.count} size="small" sx={{ fontWeight: 600, minWidth: 32, fontSize: '0.75rem' }} />
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Home;
