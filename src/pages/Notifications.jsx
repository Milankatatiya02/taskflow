import { useEffect, useState } from 'react';
import { notificationAPI, handleAPIError } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Notifications as BellIcon,
  CheckCircle as CheckIcon,
  DoneAll as DoneAllIcon,
  Info as InfoIcon,
  LocalFireDepartment as FireIcon,
  PersonAdd as InviteIcon,
  Task as TaskNoteIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';

const typeConfig = {
  welcome: { icon: <FireIcon />, color: '#f97316' },
  task: { icon: <TaskNoteIcon />, color: '#6C63FF' },
  completed: { icon: <CheckIcon />, color: '#22c55e' },
  reminder: { icon: <WarnIcon />, color: '#f59e0b' },
  invite: { icon: <InviteIcon />, color: '#3b82f6' },
  info: { icon: <InfoIcon />, color: '#8b5cf6' },
};

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

export default function Notifications() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data || []);
    } catch (err) {
      console.error(handleAPIError(err));
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(handleAPIError(err));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(handleAPIError(err));
    }
  };

  const filtered = tab === 0 ? notifications : notifications.filter((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              <BellIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={markAllRead} size="small">
              Mark All Read
            </Button>
          )}
        </Box>
      </motion.div>

      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label={`All (${notifications.length})`} />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>
      </Paper>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <BellIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No notifications</Typography>
            <Typography variant="body2" color="text.disabled">
              {tab === 1 ? "You've read all notifications" : 'Notifications will appear here'}
            </Typography>
          </Paper>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.map((n, i) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0. }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card sx={{
                  mb: 1, borderRadius: 2,
                  borderLeft: `4px solid ${cfg.color}`,
                  opacity: n.read ? 0.7 : 1,
                  bgcolor: n.read ? 'background.paper' : (theme.palette.mode === 'dark' ? '#1a1f3d' : '#f8f9ff'),
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateX(4px)', boxShadow: 2 },
                }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ color: cfg.color, mt: 0.3 }}>{cfg.icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={n.read ? 500 : 700}>{n.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatTime(n.createdAt)}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{n.message}</Typography>
                    </Box>
                    {!n.read && (
                      <IconButton size="small" onClick={() => markRead(n.id)} sx={{ color: '#22c55e' }}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </Box>
  );
}
