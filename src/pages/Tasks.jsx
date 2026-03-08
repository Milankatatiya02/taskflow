import { useEffect, useMemo, useState } from 'react';
import { taskAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Comment as CommentIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  FilterList as FilterIcon,
  Flag as FlagIcon,
  Psychology as AiIcon,
  Search as SearchIcon,
  Timer as TimerIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  Attachment as AttachmentIcon,
} from '@mui/icons-material';

const priorityRank = { High: 3, Medium: 2, Low: 1 };
const baseCategories = ['General', 'Work', 'Personal', 'Health', 'Study', 'Finance', 'Shopping'];
const recurrenceOptions = ['None', 'Daily', 'Weekly', 'Monthly'];
const OFFLINE_OPS_KEY = 'taskflow_offline_ops';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseLines(value) {
  return value
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

function nextDateByRecurrence(isoDate, recurrence) {
  if (!isoDate || recurrence === 'None') return null;
  const d = new Date(isoDate);
  if (recurrence === 'Daily') d.setDate(d.getDate() + 1);
  if (recurrence === 'Weekly') d.setDate(d.getDate() + 7);
  if (recurrence === 'Monthly') d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function Tasks() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Pending',
    priority: 'Medium',
    category: 'General',
    dueDate: '',
    recurrence: 'None',
    assignee: '',
    collaboratorsText: '',
    subtasksText: '',
    attachmentLinksText: '',
    estimatedMinutes: 0,
  });
  const [customCategory, setCustomCategory] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, taskId: null });
  const [activeTimerTaskId, setActiveTimerTaskId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentTaskId, setCommentTaskId] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [calendarScale, setCalendarScale] = useState('month');
  const [calendarCursor, setCalendarCursor] = useState(new Date());

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const queueOfflineOp = (op) => {
    const current = JSON.parse(localStorage.getItem(OFFLINE_OPS_KEY) || '[]');
    current.push(op);
    localStorage.setItem(OFFLINE_OPS_KEY, JSON.stringify(current));
  };

  const syncOfflineOps = async () => {
    const queued = JSON.parse(localStorage.getItem(OFFLINE_OPS_KEY) || '[]');
    if (!queued.length) return;

    const remaining = [];
    for (const op of queued) {
      try {
        if (op.type === 'create') {
          await taskAPI.createTask(op.payload);
        } else if (op.type === 'update') {
          await taskAPI.updateTask(op.id, op.payload);
        } else if (op.type === 'delete') {
          await taskAPI.deleteTask(op.id);
        }
      } catch {
        remaining.push(op);
      }
    }

    localStorage.setItem(OFFLINE_OPS_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) {
      fetchTasks();
    }
  };

  useEffect(() => {
    fetchTasks();
    window.addEventListener('online', syncOfflineOps);
    return () => window.removeEventListener('online', syncOfflineOps);
  }, []);

  useEffect(() => {
    localStorage.setItem('taskflow_cached_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (!activeTimerTaskId) return;
    const timer = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [activeTimerTaskId]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const now = Date.now();
    tasks.forEach((task) => {
      if (!task.dueDate || task.status === 'Completed') return;
      const remindAt = new Date(task.dueDate).getTime() - 60 * 60 * 1000;
      const key = `reminded_${task.id}_${task.dueDate}`;
      if (remindAt > now && Notification.permission === 'granted' && !localStorage.getItem(key)) {
        const timeout = remindAt - now;
        setTimeout(() => {
          new Notification('Task Reminder', { body: `"${task.title}" is due soon.` });
          localStorage.setItem(key, '1');
        }, timeout);
      }
    });
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const response = await taskAPI.getAllTasks();
      setTasks(response.data || []);
      setLoading(false);
    } catch (error) {
      const cached = JSON.parse(localStorage.getItem('taskflow_cached_tasks') || '[]');
      setTasks(cached);
      setLoading(false);
      const err = handleAPIError(error);
      showSnackbar(`Offline mode: ${err.message}`, 'warning');
    }
  };

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Task title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (formData.category === 'Custom' && !customCategory.trim()) errors.customCategory = 'Enter custom category';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const aiSuggest = () => {
    const title = formData.title.toLowerCase();
    let priority = 'Medium';
    let category = 'General';
    let description = formData.description;

    if (title.includes('bug') || title.includes('urgent') || title.includes('fix')) priority = 'High';
    if (title.includes('study') || title.includes('learn')) category = 'Study';
    if (title.includes('invoice') || title.includes('budget')) category = 'Finance';
    if (title.includes('gym') || title.includes('health')) category = 'Health';
    if (!description.trim()) description = `Plan and complete: ${formData.title}. Define clear steps and expected output.`;

    setFormData((prev) => ({ ...prev, priority, category, description }));
    setCustomCategory('');
  };

  const buildPayload = () => {
    const category = formData.category === 'Custom' ? customCategory.trim() : formData.category;
    const subtasks = parseLines(formData.subtasksText).map((title) => ({ title, completed: false }));
    const attachmentLinks = parseLines(formData.attachmentLinksText);
    const collaborators = formData.collaboratorsText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    return {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      category,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      recurrence: formData.recurrence,
      assignee: formData.assignee,
      collaborators,
      attachmentLinks,
      subtasks,
      estimatedMinutes: Number(formData.estimatedMinutes || 0),
      spentMinutes: editingTask?.spentMinutes || 0,
      comments: editingTask?.comments || [],
    };
  };

  const maybeCreateRecurring = async (updatedTask) => {
    if (updatedTask.status !== 'Completed' || !updatedTask.recurrence || updatedTask.recurrence === 'None') return;
    const nextDate = nextDateByRecurrence(updatedTask.dueDate || new Date().toISOString(), updatedTask.recurrence);
    if (!nextDate) return;

    const cloned = {
      ...updatedTask,
      status: 'Pending',
      dueDate: nextDate,
      spentMinutes: 0,
      comments: [],
      subtasks: (updatedTask.subtasks || []).map((s) => ({ ...s, completed: false })),
    };
    delete cloned.id;
    delete cloned.createdAt;
    delete cloned.updatedAt;
    try {
      const res = await taskAPI.createTask(cloned);
      setTasks((prev) => [...prev, res.data]);
    } catch {
      queueOfflineOp({ type: 'create', payload: cloned });
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    const payload = buildPayload();
    try {
      const response = await taskAPI.createTask(payload);
      setTasks((prev) => [...prev, response.data]);
      showSnackbar('Task created');
    } catch (error) {
      const err = handleAPIError(error);
      const localTask = {
        ...payload,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, localTask]);
      queueOfflineOp({ type: 'create', payload });
      showSnackbar(`Saved offline: ${err.message}`, 'warning');
    }
    closeDialog();
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    const payload = buildPayload();
    try {
      const response = await taskAPI.updateTask(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? response.data : t)));
      showSnackbar('Task updated');
      await maybeCreateRecurring(response.data);
    } catch (error) {
      const err = handleAPIError(error);
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...payload, updatedAt: new Date().toISOString() } : t)));
      queueOfflineOp({ type: 'update', id: editingTask.id, payload });
      showSnackbar(`Saved offline: ${err.message}`, 'warning');
    }
    closeDialog();
  };

  const handleDelete = async () => {
    const id = deleteDialog.taskId;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteDialog({ open: false, taskId: null });
    try {
      await taskAPI.deleteTask(id);
      showSnackbar('Task deleted');
    } catch (error) {
      queueOfflineOp({ type: 'delete', id });
      showSnackbar(`Delete queued offline: ${handleAPIError(error).message}`, 'warning');
    }
  };

  const openCreateDialog = () => {
    blurActiveElement();
    setEditingTask(null);
    setFormData({
      title: '', description: '', status: 'Pending', priority: 'Medium', category: 'General', dueDate: '', recurrence: 'None', assignee: '', collaboratorsText: '', subtasksText: '', attachmentLinksText: '', estimatedMinutes: 0,
    });
    setCustomCategory('');
    setOpenDialog(true);
  };

  const openEditDialog = (task) => {
    blurActiveElement();
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'Pending',
      priority: task.priority || 'Medium',
      category: baseCategories.includes(task.category) ? (task.category || 'General') : 'Custom',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      recurrence: task.recurrence || 'None',
      assignee: task.assignee || '',
      collaboratorsText: (task.collaborators || []).join(', '),
      subtasksText: (task.subtasks || []).map((s) => s.title).join('\n'),
      attachmentLinksText: (task.attachmentLinks || []).join('\n'),
      estimatedMinutes: task.estimatedMinutes || 0,
    });
    setCustomCategory(baseCategories.includes(task.category) ? '' : (task.category || ''));
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setCommentTaskId(null);
    setCommentDraft('');
    setFormErrors({});
  };

  const handleQuickStatus = async (task, status) => {
    const payload = { ...task, status };
    delete payload.id;
    try {
      const response = await taskAPI.updateTask(task.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? response.data : t)));
      await maybeCreateRecurring(response.data);
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
      queueOfflineOp({ type: 'update', id: task.id, payload });
    }
  };

  const handleDropToStatus = async (status) => {
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === status) return;
    await handleQuickStatus(task, status);
  };

  const addComment = async () => {
    if (!commentTaskId || !commentDraft.trim()) return;
    const task = tasks.find((t) => t.id === commentTaskId);
    if (!task) return;
    const comments = [...(task.comments || []), { text: commentDraft.trim(), createdAt: new Date().toISOString() }];
    await handleQuickTaskPatch(task, { comments });
    setCommentDraft('');
    setCommentTaskId(null);
  };

  const handleQuickTaskPatch = async (task, patch) => {
    const payload = { ...task, ...patch };
    delete payload.id;
    try {
      const response = await taskAPI.updateTask(task.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? response.data : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
      queueOfflineOp({ type: 'update', id: task.id, payload });
    }
  };

  const startTimer = (taskId) => {
    setActiveTimerTaskId(taskId);
    setTimerSeconds(0);
  };

  const stopTimer = async (task) => {
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    setActiveTimerTaskId(null);
    setTimerSeconds(0);
    await handleQuickTaskPatch(task, { spentMinutes: (task.spentMinutes || 0) + minutes });
  };

  const categoryOptions = useMemo(() => {
    const categories = new Set(baseCategories);
    tasks.forEach((task) => categories.add(task.category || 'General'));
    return Array.from(categories);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const matchSearch = `${task.title} ${task.description}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchCategory = categoryFilter === 'All' || (task.category || 'General') === categoryFilter;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'priority') return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      if (sortBy === 'dueSoon') {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return filtered;
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy]);

  const groupedByStatus = useMemo(
    () => ({
      Pending: filteredTasks.filter((t) => t.status === 'Pending'),
      'In Progress': filteredTasks.filter((t) => t.status === 'In Progress'),
      Completed: filteredTasks.filter((t) => t.status === 'Completed'),
    }),
    [filteredTasks],
  );

  const calendarDays = useMemo(() => {
    const days = [];
    if (calendarScale === 'week') {
      const start = startOfWeek(calendarCursor);
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
      return days;
    }

    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarCursor, calendarScale]);

  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [filteredTasks]);

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'error';
    if (priority === 'Medium') return 'warning';
    if (priority === 'Low') return 'success';
    return 'default';
  };

  const renderTaskCard = (task, options = {}) => {
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter((s) => s.completed).length;
    const timerRunning = activeTimerTaskId === task.id;
    const isDraggable = Boolean(options.draggable);

    return (
      <Card
        key={task.id}
        draggable={isDraggable}
        onDragStart={() => setDraggedTaskId(task.id)}
        onDragEnd={() => setDraggedTaskId(null)}
        sx={{ borderRadius: 2, mb: 1.5, cursor: isDraggable ? 'grab' : 'default' }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography fontWeight={600}>{task.title}</Typography>
            <Chip size="small" label={task.priority} color={getPriorityColor(task.priority)} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{task.description}</Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip size="small" icon={<CategoryIcon />} label={task.category || 'General'} variant="outlined" />
            {task.dueDate && <Chip size="small" icon={<EventIcon />} label={new Date(task.dueDate).toLocaleString()} variant="outlined" />}
            {task.recurrence && task.recurrence !== 'None' && <Chip size="small" label={task.recurrence} color="secondary" variant="outlined" />}
            {(task.attachmentLinks || []).length > 0 && <Chip size="small" icon={<AttachmentIcon />} label={`${task.attachmentLinks.length} attachments`} variant="outlined" />}
            {(task.comments || []).length > 0 && <Chip size="small" icon={<CommentIcon />} label={`${task.comments.length} comments`} variant="outlined" />}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Subtasks: {completedSubtasks}/{subtasks.length} | Assignee: {task.assignee || 'Unassigned'} | Time: {task.spentMinutes || 0}m / {task.estimatedMinutes || 0}m
          </Typography>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => openEditDialog(task)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, taskId: task.id })}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Comment"><IconButton size="small" onClick={() => setCommentTaskId(task.id)}><CommentIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
          <Box>
            {!timerRunning ? (
              <Button size="small" startIcon={<TimerIcon />} onClick={() => startTimer(task.id)}>Start</Button>
            ) : (
              <Button size="small" color="warning" startIcon={<TimerIcon />} onClick={() => stopTimer(task)}>Stop {Math.floor(timerSeconds / 60)}m</Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {task.status !== 'Pending' && <Button size="small" onClick={() => handleQuickStatus(task, 'Pending')}>Pending</Button>}
            {task.status !== 'In Progress' && <Button size="small" onClick={() => handleQuickStatus(task, 'In Progress')}>Progress</Button>}
            {task.status !== 'Completed' && <Button size="small" color="success" onClick={() => handleQuickStatus(task, 'Completed')}>Done</Button>}
          </Box>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Tasks</Typography>
          <Typography variant="body2" color="text.secondary">Kanban, Calendar, Recurring, Subtasks, Comments, Time tracking, Offline sync and reminders</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant={viewMode === 'list' ? 'contained' : 'outlined'} startIcon={<ListIcon />} onClick={() => setViewMode('list')}>List</Button>
          <Button variant={viewMode === 'kanban' ? 'contained' : 'outlined'} startIcon={<KanbanIcon />} onClick={() => setViewMode('kanban')}>Kanban</Button>
          <Button variant={viewMode === 'calendar' ? 'contained' : 'outlined'} startIcon={<CalendarIcon />} onClick={() => setViewMode('calendar')}>Calendar</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Add Task</Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterIcon color="action" />
        <TextField
          size="small"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 200, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sort</InputLabel>
          <Select value={sortBy} label="Sort" onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
            <MenuItem value="priority">Priority</MenuItem>
            <MenuItem value="dueSoon">Due Soon</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {loading ? <Typography color="text.secondary">Loading...</Typography> : null}

      {!loading && viewMode === 'list' && <Box>{filteredTasks.map(renderTaskCard)}</Box>}

      {!loading && viewMode === 'kanban' && (
        <Grid container spacing={2}>
          {['Pending', 'In Progress', 'Completed'].map((status) => (
            <Grid size={{ xs: 12, md: 4 }} key={status}>
              <Paper
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropToStatus(status)}
                sx={{
                  p: 1.5,
                  minHeight: 300,
                  border: '1px dashed',
                  borderColor: draggedTaskId ? 'primary.main' : 'divider',
                  bgcolor: draggedTaskId ? 'action.hover' : 'background.paper',
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 1 }}>{status}</Typography>
                {groupedByStatus[status].map((task) => renderTaskCard(task, { draggable: true }))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && viewMode === 'calendar' && (
        <Box>
          <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setCalendarScale('week')} variant={calendarScale === 'week' ? 'contained' : 'outlined'}>Week</Button>
              <Button size="small" onClick={() => setCalendarScale('month')} variant={calendarScale === 'month' ? 'contained' : 'outlined'}>Month</Button>
            </Box>
            <Typography fontWeight={700}>
              {calendarScale === 'month'
                ? calendarCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
                : `Week of ${startOfWeek(calendarCursor).toLocaleDateString()}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setCalendarCursor(new Date())}>Today</Button>
              <Button
                size="small"
                onClick={() =>
                  setCalendarCursor((prev) => {
                    const d = new Date(prev);
                    if (calendarScale === 'month') d.setMonth(d.getMonth() - 1);
                    else d.setDate(d.getDate() - 7);
                    return d;
                  })
                }
              >
                Prev
              </Button>
              <Button
                size="small"
                onClick={() =>
                  setCalendarCursor((prev) => {
                    const d = new Date(prev);
                    if (calendarScale === 'month') d.setMonth(d.getMonth() + 1);
                    else d.setDate(d.getDate() + 7);
                    return d;
                  })
                }
              >
                Next
              </Button>
            </Box>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 1 }}>
            {calendarDays.map((day) => {
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayTasks = tasksByDate[key] || [];
              const isCurrentMonth = day.getMonth() === calendarCursor.getMonth();
              const isToday = sameDay(day, new Date());
              return (
                <Paper key={key} sx={{ p: 1, minHeight: 120, opacity: calendarScale === 'month' && !isCurrentMonth ? 0.55 : 1, border: isToday ? '1px solid' : '1px solid', borderColor: isToday ? 'primary.main' : 'divider' }}>
                  <Typography variant="caption" fontWeight={700}>{day.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {dayTasks.slice(0, 3).map((task) => (
                      <Chip
                        key={task.id}
                        size="small"
                        label={task.title}
                        color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'}
                        onClick={() => openEditDialog(task)}
                      />
                    ))}
                    {dayTasks.length > 3 && <Typography variant="caption" color="text.secondary">+{dayTasks.length - 3} more</Typography>}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      <Dialog open={openDialog} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box component="span" sx={{ typography: 'h6', fontWeight: 600 }}>{editingTask ? 'Edit Task' : 'Create Task'}</Box>
          <Box>
            <Button size="small" startIcon={<AiIcon />} onClick={aiSuggest}>AI Suggest</Button>
            <IconButton onClick={closeDialog} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Title" name="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} error={!!formErrors.title} helperText={formErrors.title} sx={{ mb: 2 }} />
              <TextField fullWidth label="Description" multiline rows={3} name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} error={!!formErrors.description} helperText={formErrors.description} sx={{ mb: 2 }} />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select label="Category" name="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {baseCategories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  <MenuItem value="Custom">Custom...</MenuItem>
                </Select>
              </FormControl>
              {formData.category === 'Custom' && <TextField fullWidth label="Custom Category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} error={!!formErrors.customCategory} helperText={formErrors.customCategory} sx={{ mb: 2 }} />}
              <TextField fullWidth type="datetime-local" label="Deadline" name="dueDate" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Recurrence</InputLabel>
                <Select label="Recurrence" value={formData.recurrence} onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}>
                  {recurrenceOptions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth label="Assignee (email/name)" value={formData.assignee} onChange={(e) => setFormData({ ...formData, assignee: e.target.value })} sx={{ mb: 2 }} />
              <TextField fullWidth label="Collaborators (comma separated)" value={formData.collaboratorsText} onChange={(e) => setFormData({ ...formData, collaboratorsText: e.target.value })} sx={{ mb: 2 }} />
              <TextField fullWidth type="number" label="Estimated Minutes" value={formData.estimatedMinutes} onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })} sx={{ mb: 2 }} />
              <TextField fullWidth multiline rows={3} label="Subtasks (one per line)" value={formData.subtasksText} onChange={(e) => setFormData({ ...formData, subtasksText: e.target.value })} sx={{ mb: 2 }} />
              <TextField fullWidth multiline rows={3} label="Attachment links (one per line)" value={formData.attachmentLinksText} onChange={(e) => setFormData({ ...formData, attachmentLinksText: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={editingTask ? handleUpdate : handleCreate}>{editingTask ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, taskId: null })}>
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent><Typography color="text.secondary">This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, taskId: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(commentTaskId)} onClose={() => setCommentTaskId(null)}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentTaskId(null)}>Cancel</Button>
          <Button variant="contained" onClick={addComment}>Add</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default Tasks;
