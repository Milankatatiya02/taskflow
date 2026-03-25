import { useEffect, useMemo, useState } from 'react';
import { taskAPI, labelAPI, projectAPI, templateAPI, uploadAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
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
  CloudUpload as UploadIcon,
  Comment as CommentIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  FilterList as FilterIcon,
  Flag as FlagIcon,
  Label as LabelIcon,
  Psychology as AiIcon,
  SaveAlt as TemplateIcon,
  Search as SearchIcon,
  SelectAll as SelectAllIcon,
  Timer as TimerIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  Attachment as AttachmentIcon,
  Folder as ProjectIcon,
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
    projectId: '',
    labels: [],
  });
  const [customCategory, setCustomCategory] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
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

  // New feature state
  const [labels, setLabels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [newLabelDialog, setNewLabelDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6C63FF');

  const labelColors = ['#6C63FF', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#3b82f6'];

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
        if (op.type === 'create') await taskAPI.createTask(op.payload);
        else if (op.type === 'update') await taskAPI.updateTask(op.id, op.payload);
        else if (op.type === 'delete') await taskAPI.deleteTask(op.id);
      } catch {
        remaining.push(op);
      }
    }
    localStorage.setItem(OFFLINE_OPS_KEY, JSON.stringify(remaining));
    if (remaining.length === 0) fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
    loadLabels();
    loadProjects();
    loadTemplates();
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
    if (Notification.permission === 'default') Notification.requestPermission();
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

  const loadLabels = async () => {
    try { const res = await labelAPI.getAll(); setLabels(res.data || []); } catch { /* silent */ }
  };
  const loadProjects = async () => {
    try { const res = await projectAPI.getAll(); setProjects(res.data || []); } catch { /* silent */ }
  };
  const loadTemplates = async () => {
    try { const res = await templateAPI.getAll(); setTemplates(res.data || []); } catch { /* silent */ }
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
    const collaborators = formData.collaboratorsText.split(',').map((x) => x.trim()).filter(Boolean);

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
      attachments: taskAttachments,
      subtasks,
      estimatedMinutes: Number(formData.estimatedMinutes || 0),
      spentMinutes: editingTask?.spentMinutes || 0,
      comments: editingTask?.comments || [],
      projectId: formData.projectId || null,
      labels: formData.labels || [],
    };
  };

  const maybeCreateRecurring = async (updatedTask) => {
    if (updatedTask.status !== 'Completed' || !updatedTask.recurrence || updatedTask.recurrence === 'None') return;
    const nextDate = nextDateByRecurrence(updatedTask.dueDate || new Date().toISOString(), updatedTask.recurrence);
    if (!nextDate) return;
    const cloned = {
      ...updatedTask, status: 'Pending', dueDate: nextDate, spentMinutes: 0, comments: [],
      subtasks: (updatedTask.subtasks || []).map((s) => ({ ...s, completed: false })),
    };
    delete cloned.id; delete cloned.createdAt; delete cloned.updatedAt;
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
      const localTask = { ...payload, id: `local-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
      title: '', description: '', status: 'Pending', priority: 'Medium', category: 'General',
      dueDate: '', recurrence: 'None', assignee: '', collaboratorsText: '', subtasksText: '',
      attachmentLinksText: '', estimatedMinutes: 0, projectId: '', labels: [],
    });
    setCustomCategory('');
    setTaskAttachments([]);
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
      projectId: task.projectId || '',
      labels: task.labels || [],
    });
    setCustomCategory(baseCategories.includes(task.category) ? '' : (task.category || ''));
    setTaskAttachments(task.attachments || []);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setCommentTaskId(null);
    setCommentDraft('');
    setFormErrors({});
    setTaskAttachments([]);
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

  const startTimer = (taskId) => { setActiveTimerTaskId(taskId); setTimerSeconds(0); };

  const stopTimer = async (task) => {
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    setActiveTimerTaskId(null);
    setTimerSeconds(0);
    await handleQuickTaskPatch(task, { spentMinutes: (task.spentMinutes || 0) + minutes });
  };

  // --- Bulk Actions ---
  const toggleSelectTask = (taskId) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedTasks.size === filteredTasks.length) setSelectedTasks(new Set());
    else setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedTasks);
    setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)));
    setSelectedTasks(new Set());
    setBulkMode(false);
    try {
      await taskAPI.bulkAction(ids, 'delete');
      showSnackbar(`${ids.length} tasks deleted`);
    } catch (err) {
      showSnackbar(handleAPIError(err).message, 'error');
    }
  };

  const handleBulkStatus = async (status) => {
    const ids = Array.from(selectedTasks);
    setTasks((prev) => prev.map((t) => (selectedTasks.has(t.id) ? { ...t, status } : t)));
    setSelectedTasks(new Set());
    setBulkMode(false);
    try {
      await taskAPI.bulkAction(ids, 'status_change', status);
      showSnackbar(`${ids.length} tasks updated`);
    } catch (err) {
      showSnackbar(handleAPIError(err).message, 'error');
    }
  };

  // --- Templates ---
  const saveAsTemplate = async () => {
    if (!templateName.trim() || !editingTask) return;
    try {
      const res = await templateAPI.create({
        name: templateName,
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        category: editingTask.category,
        subtasks: editingTask.subtasks,
        estimatedMinutes: editingTask.estimatedMinutes,
      });
      setTemplates((prev) => [res.data, ...prev]);
      showSnackbar('Template saved');
    } catch (err) {
      showSnackbar(handleAPIError(err).message, 'error');
    }
    setTemplateDialog(false);
    setTemplateName('');
  };

  const useTemplate = (tpl) => {
    setFormData((prev) => ({
      ...prev,
      title: tpl.title || prev.title,
      description: tpl.description || prev.description,
      priority: tpl.priority || prev.priority,
      category: tpl.category || prev.category,
      subtasksText: (tpl.subtasks || []).map((s) => s.title).join('\n'),
      estimatedMinutes: tpl.estimatedMinutes || 0,
    }));
    showSnackbar('Template applied');
  };

  // --- Labels ---
  const createLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await labelAPI.create({ name: newLabelName, color: newLabelColor });
      setLabels((prev) => [...prev, res.data]);
      showSnackbar('Label created');
    } catch (err) {
      showSnackbar(handleAPIError(err).message, 'error');
    }
    setNewLabelDialog(false);
    setNewLabelName('');
  };

  // --- File Upload ---
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showSnackbar('File too large (max 10 MB)', 'error'); return; }
    setUploadingFile(true);
    try {
      const res = await uploadAPI.upload(file);
      setTaskAttachments((prev) => [...prev, res.data.url]);
      showSnackbar('File uploaded');
    } catch (err) {
      showSnackbar(handleAPIError(err).message, 'error');
    } finally {
      setUploadingFile(false);
    }
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
      const matchProject = projectFilter === 'All' || task.projectId === projectFilter;
      return matchSearch && matchStatus && matchPriority && matchCategory && matchProject;
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
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, projectFilter, sortBy]);

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
      for (let i = 0; i < 7; i += 1) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
      return days;
    }
    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const gridStart = startOfWeek(monthStart);
    for (let i = 0; i < 42; i += 1) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); days.push(d); }
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

  const getLabelById = (id) => labels.find((l) => l.id === id);
  const getProjectById = (id) => projects.find((p) => p.id === id);

  const renderTaskCard = (task, options = {}) => {
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter((s) => s.completed).length;
    const timerRunning = activeTimerTaskId === task.id;
    const isDraggable = Boolean(options.draggable);
    const isSelected = selectedTasks.has(task.id);
    const taskLabels = (task.labels || []).map(getLabelById).filter(Boolean);
    const project = task.projectId ? getProjectById(task.projectId) : null;

    return (
      <Card
        key={task.id}
        draggable={isDraggable}
        onDragStart={() => setDraggedTaskId(task.id)}
        onDragEnd={() => setDraggedTaskId(null)}
        sx={{
          borderRadius: 2, mb: 1.5, cursor: isDraggable ? 'grab' : 'default',
          border: isSelected ? '2px solid' : undefined,
          borderColor: isSelected ? 'primary.main' : undefined,
          transition: 'all 0.15s',
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {bulkMode && (
                <Checkbox size="small" checked={isSelected} onChange={() => toggleSelectTask(task.id)} sx={{ p: 0 }} />
              )}
              <Typography fontWeight={600}>{task.title}</Typography>
            </Box>
            <Chip size="small" label={task.priority} color={getPriorityColor(task.priority)} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{task.description}</Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            <Chip size="small" icon={<CategoryIcon />} label={task.category || 'General'} variant="outlined" />
            {task.dueDate && <Chip size="small" icon={<EventIcon />} label={new Date(task.dueDate).toLocaleString()} variant="outlined" />}
            {task.recurrence && task.recurrence !== 'None' && <Chip size="small" label={task.recurrence} color="secondary" variant="outlined" />}
            {(task.attachmentLinks || []).length > 0 && <Chip size="small" icon={<AttachmentIcon />} label={`${task.attachmentLinks.length} links`} variant="outlined" />}
            {(task.attachments || []).length > 0 && <Chip size="small" icon={<UploadIcon />} label={`${task.attachments.length} files`} variant="outlined" />}
            {(task.comments || []).length > 0 && <Chip size="small" icon={<CommentIcon />} label={`${task.comments.length}`} variant="outlined" />}
            {project && <Chip size="small" icon={<ProjectIcon />} label={project.name} sx={{ bgcolor: `${project.color}18`, color: project.color, border: `1px solid ${project.color}44` }} />}
            {taskLabels.map((l) => (
              <Chip key={l.id} size="small" label={l.name} sx={{ bgcolor: `${l.color}22`, color: l.color, fontWeight: 600, fontSize: '0.7rem' }} />
            ))}
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Tasks</Typography>
          <Typography variant="body2" color="text.secondary">Manage, track, and organize your tasks</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant={viewMode === 'list' ? 'contained' : 'outlined'} startIcon={<ListIcon />} onClick={() => setViewMode('list')} size="small">List</Button>
          <Button variant={viewMode === 'kanban' ? 'contained' : 'outlined'} startIcon={<KanbanIcon />} onClick={() => setViewMode('kanban')} size="small">Kanban</Button>
          <Button variant={viewMode === 'calendar' ? 'contained' : 'outlined'} startIcon={<CalendarIcon />} onClick={() => setViewMode('calendar')} size="small">Calendar</Button>
          <Button variant={bulkMode ? 'contained' : 'outlined'} color={bulkMode ? 'secondary' : 'inherit'} startIcon={<SelectAllIcon />} onClick={() => { setBulkMode(!bulkMode); setSelectedTasks(new Set()); }} size="small">
            {bulkMode ? 'Exit Bulk' : 'Bulk'}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} size="small">Add Task</Button>
        </Box>
      </Box>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedTasks.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'primary.main', color: '#fff', borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600}>{selectedTasks.size} selected</Typography>
          <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff8' }} onClick={selectAll}>
            {selectedTasks.size === filteredTasks.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff8' }} onClick={() => handleBulkStatus('Completed')}>Mark Done</Button>
          <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff8' }} onClick={() => handleBulkStatus('Pending')}>Mark Pending</Button>
          <Button size="small" variant="outlined" sx={{ color: '#ff6b6b', borderColor: '#ff6b6b88' }} onClick={handleBulkDelete}>Delete All</Button>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterIcon color="action" />
        <TextField
          size="small" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 180, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="High">High</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
            <MenuItem value="All">All</MenuItem>
            {categoryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        {projects.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Project</InputLabel>
            <Select value={projectFilter} label="Project" onChange={(e) => setProjectFilter(e.target.value)}>
              <MenuItem value="All">All</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 110 }}>
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
                  p: 1.5, minHeight: 300, border: '1px dashed',
                  borderColor: draggedTaskId ? 'primary.main' : 'divider',
                  bgcolor: draggedTaskId ? 'action.hover' : 'background.paper',
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 1 }}>{status} ({groupedByStatus[status].length})</Typography>
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
              <Button size="small" onClick={() => setCalendarCursor((prev) => { const d = new Date(prev); if (calendarScale === 'month') d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7); return d; })}>Prev</Button>
              <Button size="small" onClick={() => setCalendarCursor((prev) => { const d = new Date(prev); if (calendarScale === 'month') d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7); return d; })}>Next</Button>
            </Box>
          </Paper>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 1 }}>
            {calendarDays.map((day) => {
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayTasks = tasksByDate[key] || [];
              const isCurrentMonth = day.getMonth() === calendarCursor.getMonth();
              const isToday = sameDay(day, new Date());
              return (
                <Paper key={key} sx={{ p: 1, minHeight: 100, opacity: calendarScale === 'month' && !isCurrentMonth ? 0.55 : 1, border: '1px solid', borderColor: isToday ? 'primary.main' : 'divider' }}>
                  <Typography variant="caption" fontWeight={700}>{day.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {dayTasks.slice(0, 3).map((task) => (
                      <Chip key={task.id} size="small" label={task.title}
                        color={task.priority === 'High' ? 'error' : task.priority === 'Medium' ? 'warning' : 'default'}
                        onClick={() => openEditDialog(task)} sx={{ maxWidth: '100%' }} />
                    ))}
                    {dayTasks.length > 3 && <Typography variant="caption" color="text.secondary">+{dayTasks.length - 3} more</Typography>}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ---- Create / Edit Dialog ---- */}
      <Dialog open={openDialog} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box component="span" sx={{ typography: 'h6', fontWeight: 600 }}>{editingTask ? 'Edit Task' : 'Create Task'}</Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {templates.length > 0 && !editingTask && (
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Template</InputLabel>
                <Select label="Template" value="" onChange={(e) => { const tpl = templates.find(t => t.id === e.target.value); if (tpl) useTemplate(tpl); }}>
                  {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {editingTask && (
              <Tooltip title="Save as template">
                <IconButton size="small" onClick={() => setTemplateDialog(true)}><TemplateIcon /></IconButton>
              </Tooltip>
            )}
            <Button size="small" startIcon={<AiIcon />} onClick={aiSuggest}>AI</Button>
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
              {/* Project Selector */}
              {projects.length > 0 && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Project</InputLabel>
                  <Select label="Project" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}>
                    <MenuItem value="">None</MenuItem>
                    {projects.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color }} />
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
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
              <TextField fullWidth multiline rows={2} label="Subtasks (one per line)" value={formData.subtasksText} onChange={(e) => setFormData({ ...formData, subtasksText: e.target.value })} sx={{ mb: 2 }} />
              <TextField fullWidth multiline rows={2} label="Attachment links (one per line)" value={formData.attachmentLinksText} onChange={(e) => setFormData({ ...formData, attachmentLinksText: e.target.value })} sx={{ mb: 1 }} />

              {/* Labels */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" fontWeight={600}><LabelIcon fontSize="inherit" /> Labels</Typography>
                  <Button size="small" onClick={() => setNewLabelDialog(true)} sx={{ fontSize: '0.7rem', minWidth: 0 }}>+ New</Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {labels.map((l) => {
                    const isSelected = formData.labels.includes(l.id);
                    return (
                      <Chip
                        key={l.id} size="small" label={l.name}
                        onClick={() => setFormData((prev) => ({
                          ...prev,
                          labels: isSelected ? prev.labels.filter((id) => id !== l.id) : [...prev.labels, l.id],
                        }))}
                        sx={{
                          bgcolor: isSelected ? `${l.color}33` : 'transparent',
                          color: l.color, fontWeight: 600,
                          border: `1px solid ${l.color}${isSelected ? '' : '44'}`,
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>

              {/* File Upload */}
              <Box>
                <Button
                  variant="outlined" size="small" component="label" startIcon={<UploadIcon />}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : 'Upload File'}
                  <input type="file" hidden onChange={handleFileUpload} />
                </Button>
                {taskAttachments.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {taskAttachments.map((url, i) => (
                      <Chip key={i} size="small" label={url.split('/').pop()} variant="outlined"
                        onDelete={() => setTaskAttachments((prev) => prev.filter((_, j) => j !== i))} />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={editingTask ? handleUpdate : handleCreate}>{editingTask ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, taskId: null })}>
        <DialogTitle>Delete Task?</DialogTitle>
        <DialogContent><Typography color="text.secondary">This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, taskId: null })}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={Boolean(commentTaskId)} onClose={() => setCommentTaskId(null)}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentTaskId(null)}>Cancel</Button>
          <Button variant="contained" onClick={addComment}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Template Save Dialog */}
      <Dialog open={templateDialog} onClose={() => setTemplateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save as Template</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Template Name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAsTemplate}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* New Label Dialog */}
      <Dialog open={newLabelDialog} onClose={() => setNewLabelDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create Label</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Label Name" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" fontWeight={600}>Color</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            {labelColors.map((c) => (
              <Box key={c} onClick={() => setNewLabelColor(c)} sx={{
                width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                border: newLabelColor === c ? '3px solid' : '2px solid transparent',
                borderColor: newLabelColor === c ? 'text.primary' : 'transparent',
              }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLabelDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={createLabel}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default Tasks;
