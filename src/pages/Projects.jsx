import { useEffect, useState } from 'react';
import { projectAPI, handleAPIError } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Group as GroupIcon,
  PersonAdd as InviteIcon,
} from '@mui/icons-material';

const projectColors = ['#6C63FF', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#3b82f6'];

export default function Projects() {
  const theme = useTheme();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6C63FF' });
  const [inviteDialog, setInviteDialog] = useState({ open: false, projectId: null, projectName: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, projectId: null });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const res = await projectAPI.getAll();
      setProjects(res.data || []);
    } catch (err) {
      console.error(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', color: projectColors[Math.floor(Math.random() * projectColors.length)] });
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, color: p.color });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        const res = await projectAPI.update(editing.id, form);
        setProjects((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...res.data } : p)));
        setSnack({ open: true, message: 'Project updated', severity: 'success' });
      } else {
        const res = await projectAPI.create(form);
        setProjects((prev) => [res.data, ...prev]);
        setSnack({ open: true, message: 'Project created', severity: 'success' });
      }
    } catch (err) {
      setSnack({ open: true, message: handleAPIError(err).message, severity: 'error' });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    try {
      await projectAPI.delete(deleteDialog.projectId);
      setProjects((prev) => prev.filter((p) => p.id !== deleteDialog.projectId));
      setSnack({ open: true, message: 'Project deleted', severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: handleAPIError(err).message, severity: 'error' });
    }
    setDeleteDialog({ open: false, projectId: null });
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await projectAPI.invite(inviteDialog.projectId, inviteEmail);
      setSnack({ open: true, message: `Invited ${inviteEmail}`, severity: 'success' });
      setInviteEmail('');
      setInviteDialog({ open: false, projectId: null, projectName: '' });
    } catch (err) {
      setSnack({ open: true, message: handleAPIError(err).message, severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              <FolderIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Projects
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Organize your tasks into projects
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
            New Project
          </Button>
        </Box>
      </motion.div>

      {projects.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
            <FolderOpenIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>No projects yet</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your first project to start organizing tasks
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} size="large">
              Create Project
            </Button>
          </Paper>
        </motion.div>
      ) : (
        <Grid container spacing={2}>
          <AnimatePresence mode="popLayout">
            {projects.map((p, i) => {
              const progress = p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Card sx={{
                      borderRadius: 3,
                      borderTop: `4px solid ${p.color}`,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <CardContent sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{
                            width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: `${p.color}22`, color: p.color,
                          }}>
                            <FolderIcon />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{p.name}</Typography>
                            {p.members?.length > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                <GroupIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.3 }} />
                                {p.members.length} member{p.members.length > 1 ? 's' : ''}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        {p.description && (
                          <Typography variant="body2" color="text.secondary" sx={{
                            mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {p.description}
                          </Typography>
                        )}

                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {p.completedCount}/{p.taskCount} tasks
                            </Typography>
                            <Typography variant="caption" fontWeight={600} sx={{ color: p.color }}>
                              {progress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 6, borderRadius: 3,
                              bgcolor: theme.palette.mode === 'dark' ? '#1e2240' : '#e5e7eb',
                              '& .MuiLinearProgress-bar': { bgcolor: p.color, borderRadius: 3 },
                            }}
                          />
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                        <Tooltip title="Invite member">
                          <IconButton size="small" onClick={() => setInviteDialog({ open: true, projectId: p.id, projectName: p.name })}>
                            <InviteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, projectId: p.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </motion.div>
                </Grid>
              );
            })}
          </AnimatePresence>
        </Grid>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Description" multiline rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Color</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {projectColors.map((c) => (
              <Box
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                sx={{
                  width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: form.color === c ? '3px solid' : '2px solid transparent',
                  borderColor: form.color === c ? 'text.primary' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.15)' },
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog.open} onClose={() => setInviteDialog({ open: false, projectId: null, projectName: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Invite to "{inviteDialog.projectName}"</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Member email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} sx={{ mt: 1 }} placeholder="user@example.com" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog({ open: false, projectId: null, projectName: '' })}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite}>Invite</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, projectId: null })}>
        <DialogTitle>Delete Project?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Tasks in this project will be unlinked but not deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, projectId: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })} sx={{ borderRadius: 2 }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
