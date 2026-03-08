import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, activityAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Paper,
    List, ListItem, ListItemText, ListItemIcon, Divider, Button
} from '@mui/material';
import {
    Assignment as TaskIcon,
    CheckCircle as CompletedIcon,
    HourglassEmpty as PendingIcon,
    TrendingUp as ProgressIcon,
    ArrowForward as ArrowIcon,
    Circle as CircleIcon,
    WarningAmber as WarningIcon,
    EventAvailable as UpcomingIcon,
    Category as CategoryIcon,
    Timeline as TimelineIcon,
    Psychology as AiIcon
} from '@mui/icons-material';

function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tasksRes, activityRes] = await Promise.allSettled([taskAPI.getAllTasks(), activityAPI.getAll()]);
            if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data || []);
            if (activityRes.status === 'fulfilled') setActivities(activityRes.value.data || []);
        } catch (error) {
            const err = handleAPIError(error);
            console.error(err.message);
        }
    };

    const isOverdue = (task) => {
        if (!task.dueDate || task.status === 'Completed') return false;
        return new Date(task.dueDate) < new Date();
    };

    const isUpcoming = (task) => {
        if (!task.dueDate || task.status === 'Completed') return false;
        const due = new Date(task.dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    };

    const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'Completed').length,
        inProgress: tasks.filter((t) => t.status === 'In Progress').length,
        pending: tasks.filter((t) => t.status === 'Pending').length,
        overdue: tasks.filter(isOverdue).length,
        upcoming: tasks.filter(isUpcoming).length,
        timeSpent: tasks.reduce((acc, t) => acc + (t.spentMinutes || 0), 0),
    };

    const velocity = useMemo(() => {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return tasks.filter((t) => t.status === 'Completed' && new Date(t.updatedAt).getTime() >= oneWeekAgo).length;
    }, [tasks]);

    const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const recentActivities = activities.slice(0, 6);

    const topCategories = Object.entries(
        tasks.reduce((acc, task) => {
            const key = task.category || 'General';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const statCards = [
        { label: 'Total Tasks', value: stats.total, icon: <TaskIcon />, color: '#6C63FF', bg: 'rgba(108,99,255,0.08)' },
        { label: 'Completed', value: stats.completed, icon: <CompletedIcon />, color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
        { label: 'In Progress', value: stats.inProgress, icon: <ProgressIcon />, color: '#FF9800', bg: 'rgba(255,152,0,0.08)' },
        { label: 'Pending', value: stats.pending, icon: <PendingIcon />, color: '#F44336', bg: 'rgba(244,67,54,0.08)' },
        { label: 'Overdue', value: stats.overdue, icon: <WarningIcon />, color: '#E53935', bg: 'rgba(229,57,53,0.08)' },
        { label: 'Due in 3 days', value: stats.upcoming, icon: <UpcomingIcon />, color: '#00ACC1', bg: 'rgba(0,172,193,0.08)' },
    ];

    const aiSuggestion = velocity < 3
        ? 'Low completion velocity this week. Try reducing active tasks and scheduling focused 25-minute sessions.'
        : 'Great momentum. Keep your top 3 priorities visible and close pending high-priority tasks first.';

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant={{ xs: 'h5', sm: 'h4', md: 'h4' }} fontWeight={700} gutterBottom>
                        Welcome back, {user.name}!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Smart overview with insights, timeline and productivity guidance.
                    </Typography>
                </Box>
            </motion.div>

            <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 3 }}>
                {statCards.map((stat, index) => (
                    <Grid size={{ xs: 6, sm: 4, md: 2 }} key={stat.label}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }}>
                            <Card sx={{ borderRadius: { xs: 2, md: 3 }, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
                                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, mb: 1 }}>
                                        {stat.icon}
                                    </Box>
                                    <Typography variant={{ xs: 'h6', md: 'h5' }} fontWeight={700} color={stat.color}>{stat.value}</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{stat.label}</Typography>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <AiIcon fontSize="small" color="primary" />
                    <Typography fontWeight={700}>AI Productivity Suggestion</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{aiSuggestion}</Typography>
                <Typography variant="caption" color="text.secondary">Velocity (last 7 days): {velocity} completed tasks | Time tracked: {stats.timeSpent} minutes</Typography>
            </Paper>

            <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ borderRadius: { xs: 2, md: 3 }, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                        <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Typography variant={{ xs: 'subtitle1', md: 'h6' }} fontWeight={600}>Recent Tasks</Typography>
                            <Button endIcon={<ArrowIcon />} onClick={() => navigate('/tasks')} sx={{ textTransform: 'none', color: '#6C63FF' }}>View All</Button>
                        </Box>
                        <Divider />
                        <List sx={{ p: 0 }}>
                            {recentTasks.map((task, index) => (
                                <ListItem key={task.id} sx={{ px: { xs: 2, md: 3 }, py: 1.5, borderBottom: index < recentTasks.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                    <ListItemIcon sx={{ minWidth: 36 }}><CircleIcon sx={{ fontSize: 10, color: task.priority === 'High' ? '#F44336' : task.priority === 'Medium' ? '#FF9800' : '#4CAF50' }} /></ListItemIcon>
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight={500}>{task.title}</Typography>}
                                        secondary={<Typography variant="caption">{task.category || 'General'} • {task.assignee || 'Unassigned'}</Typography>}
                                    />
                                    <Chip label={task.status} size="small" variant="outlined" sx={{ mr: 1 }} />
                                    {task.dueDate && <Chip label={new Date(task.dueDate).toLocaleDateString()} size="small" color={isOverdue(task) ? 'error' : 'default'} />}
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ borderRadius: { xs: 2, md: 3 }, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', p: { xs: 2, md: 3 }, mb: 2 }}>
                        <Typography variant={{ xs: 'subtitle1', md: 'h6' }} fontWeight={600} gutterBottom>Category Focus</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {topCategories.map(([category, count]) => (
                            <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CategoryIcon sx={{ fontSize: 16, color: '#6C63FF' }} /><Typography variant="body2">{category}</Typography></Box>
                                <Chip label={count} size="small" />
                            </Box>
                        ))}
                    </Paper>

                    <Paper sx={{ borderRadius: { xs: 2, md: 3 }, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', p: { xs: 2, md: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TimelineIcon fontSize="small" color="primary" />
                            <Typography variant={{ xs: 'subtitle1', md: 'h6' }} fontWeight={600}>Activity Timeline</Typography>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                        {recentActivities.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No activities yet.</Typography>
                        ) : recentActivities.map((a) => (
                            <Box key={a.id} sx={{ mb: 1.2 }}>
                                <Typography variant="body2" fontWeight={500}>{a.message}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(a.createdAt).toLocaleString()}</Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Home;
