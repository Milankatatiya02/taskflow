import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
    Box, Typography, Button, TextField, Grid, Card, CardContent,
    CardActions, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select, FormControl, InputLabel, InputAdornment,
    IconButton, Alert, Snackbar, Tooltip, Paper, Divider, Fab, useMediaQuery, useTheme
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Close as CloseIcon,
    Assignment as TaskIcon,
    Flag as FlagIcon
} from '@mui/icons-material';

function Tasks() {
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', status: 'Pending', priority: 'Medium'
    });
    const [formErrors, setFormErrors] = useState({});

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    // Snackbar state
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Delete confirmation
    const [deleteDialog, setDeleteDialog] = useState({ open: false, taskId: null });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await taskAPI.getAllTasks();
            setTasks(response.data || []);
        } catch (error) {
            const err = handleAPIError(error);
            showSnackbar(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── Form Validation ───
    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) {
            errors.title = 'Task title is required';
        } else if (formData.title.trim().length < 3) {
            errors.title = 'Title must be at least 3 characters';
        }
        if (!formData.description.trim()) {
            errors.description = 'Description is required';
        } else if (formData.description.trim().length < 5) {
            errors.description = 'Description must be at least 5 characters';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ─── CRUD Operations ───
    const handleCreate = async () => {
        if (!validateForm()) return;
        try {
            const response = await taskAPI.createTask(formData);
            setTasks([...tasks, response.data]);
            closeDialog();
            showSnackbar('Task created successfully!');
        } catch (error) {
            const err = handleAPIError(error);
            showSnackbar(err.message, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;
        try {
            const response = await taskAPI.updateTask(editingTask.id, formData);
            setTasks(tasks.map(t => t.id === editingTask.id ? response.data : t));
            closeDialog();
            showSnackbar('Task updated successfully!');
        } catch (error) {
            const err = handleAPIError(error);
            showSnackbar(err.message, 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await taskAPI.deleteTask(deleteDialog.taskId);
            setTasks(tasks.filter(t => t.id !== deleteDialog.taskId));
            setDeleteDialog({ open: false, taskId: null });
            showSnackbar('Task deleted successfully!');
        } catch (error) {
            const err = handleAPIError(error);
            showSnackbar(err.message, 'error');
        }
    };

    // ─── Dialog Helpers ───
    const openCreateDialog = () => {
        setEditingTask(null);
        setFormData({ title: '', description: '', status: 'Pending', priority: 'Medium' });
        setFormErrors({});
        setOpenDialog(true);
    };

    const openEditDialog = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority
        });
        setFormErrors({});
        setOpenDialog(true);
    };

    const closeDialog = () => {
        setOpenDialog(false);
        setEditingTask(null);
        setFormData({ title: '', description: '', status: 'Pending', priority: 'Medium' });
        setFormErrors({});
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (formErrors[e.target.name]) {
            setFormErrors({ ...formErrors, [e.target.name]: '' });
        }
    };

    // ─── Filtering ───
    const filteredTasks = tasks.filter(task => {
        const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'All' || task.status === statusFilter;
        const matchPriority = priorityFilter === 'All' || task.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
    });

    // ─── Style Helpers ───
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

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: { xs: 1.5, md: 2 } }}>
                    <Box>
                        <Typography variant={{ xs: 'h5', md: 'h4' }} fontWeight={700}>Tasks</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                            Manage your tasks • {filteredTasks.length} of {tasks.length} shown
                        </Typography>
                    </Box>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                            size={isMobile ? 'small' : 'medium'}
                            sx={{
                                bgcolor: '#6C63FF',
                                textTransform: 'none',
                                borderRadius: 2,
                                px: { xs: 2, md: 3 },
                                fontWeight: 600,
                                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                                fontSize: { xs: 13, sm: 16 },
                                '&:hover': { 
                                    bgcolor: '#5A52E0',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(108, 99, 255, 0.4)'
                                }
                            }}
                        >
                            Add Task
                        </Button>
                    </motion.div>
                </Box>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <Paper
                    sx={{
                        p: { xs: 1.5, sm: 2 }, mb: 3, borderRadius: { xs: 2, md: 3 },
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                        display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', alignItems: 'center'
                    }}
                >
                    <FilterIcon sx={{ color: '#999', fontSize: { xs: 20, sm: 24 } }} />
                    <TextField
                        size="small"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ minWidth: { xs: 120, sm: 200 }, flexGrow: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#bbb', fontSize: 20 }} />
                                </InputAdornment>
                            )
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: { xs: 100, md: 140 } }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="All">All Status</MenuItem>
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="In Progress">In Progress</MenuItem>
                            <MenuItem value="Completed">Completed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: { xs: 100, md: 140 } }}>
                        <InputLabel>Priority</InputLabel>
                        <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                            <MenuItem value="All">All Priority</MenuItem>
                            <MenuItem value="Low">Low</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="High">High</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>
            </motion.div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <Paper sx={{ p: { xs: 3, md: 6 }, textAlign: 'center', borderRadius: { xs: 2, md: 3 }, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <TaskIcon sx={{ fontSize: { xs: 40, md: 60 }, color: '#ddd', mb: 2 }} />
                        <Typography variant={{ xs: 'subtitle1', md: 'h6' }} color="text.secondary" gutterBottom>
                            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                            {tasks.length === 0 ? 'Click "Add Task" to create your first task.' : 'Try adjusting your filters.'}
                        </Typography>
                    </Paper>
                </motion.div>
            ) : (
                <Grid container spacing={{ xs: 1.5, sm: 2, md: 2 }}>
                    {filteredTasks.map((task, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={task.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }}
                                whileHover={{ y: -4 }}
                            >
                                <Card
                                    sx={{
                                        borderRadius: { xs: 2, md: 3 },
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        '&:hover': {
                                            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                                        },
                                        borderLeft: `4px solid ${getPriorityColor(task.priority)}`
                                    }}
                                >
                                    <CardContent sx={{ pb: 1, flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography variant={{ xs: 'subtitle2', sm: 'h6' }} fontWeight={600} sx={{ fontSize: { xs: 14, sm: 16 }, lineHeight: 1.4, flex: 1, mr: 1 }}>
                                                {task.title}
                                            </Typography>
                                            <Chip
                                                label={task.status}
                                                color={getStatusColor(task.status)}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: { xs: 10, sm: 11 }, height: 24 }}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                            {task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Chip
                                                icon={<FlagIcon sx={{ fontSize: 14 }} />}
                                                label={task.priority}
                                                size="small"
                                                sx={{
                                                    bgcolor: `${getPriorityColor(task.priority)}15`,
                                                    color: getPriorityColor(task.priority),
                                                    fontWeight: 600,
                                                    fontSize: { xs: 10, sm: 11 },
                                                    '& .MuiChip-icon': { color: getPriorityColor(task.priority) }
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                                {formatDate(task.createdAt)}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    <Divider />
                                    <CardActions sx={{ px: 2, py: 1 }}>
                                        <Tooltip title="Edit">
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                <IconButton size="small" onClick={() => openEditDialog(task)} sx={{ color: '#6C63FF' }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </motion.div>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDeleteDialog({ open: true, taskId: task.id })}
                                                    sx={{ color: '#F44336' }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </motion.div>
                                        </Tooltip>
                                    </CardActions>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create/Edit Task Dialog */}
            <Dialog
                open={openDialog}
                onClose={closeDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>
                        {editingTask ? 'Edit Task' : 'Create New Task'}
                    </Typography>
                    <IconButton onClick={closeDialog} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Task Title"
                            name="title"
                            value={formData.title}
                            onChange={handleFormChange}
                            error={!!formErrors.title}
                            helperText={formErrors.title}
                            placeholder="Enter task title"
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleFormChange}
                            error={!!formErrors.description}
                            helperText={formErrors.description}
                            multiline
                            rows={3}
                            placeholder="Enter task description"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select name="status" value={formData.status} label="Status" onChange={handleFormChange}>
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select name="priority" value={formData.priority} label="Priority" onChange={handleFormChange}>
                                <MenuItem value="Low">Low</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="High">High</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeDialog} sx={{ textTransform: 'none', color: '#999' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={editingTask ? handleUpdate : handleCreate}
                        sx={{
                            bgcolor: '#6C63FF',
                            textTransform: 'none',
                            borderRadius: 2,
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#5A52E0' }
                        }}
                    >
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, taskId: null })}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>
                    <Typography variant="h6" fontWeight={600}>Delete Task?</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete this task? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteDialog({ open: false, taskId: null })}
                        sx={{ textTransform: 'none', color: '#999' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default Tasks;
