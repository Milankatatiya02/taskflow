import { useEffect, useState } from 'react';
import { dashboardAPI, activityAPI, handleAPIError } from '../services/api';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as CompletedIcon,
  HourglassTop as PendingIcon,
  Loop as InProgressIcon,
  Warning as OverdueIcon,
  LocalFireDepartment as StreakIcon,
  Timer as TimerIcon,
  TrendingUp as TrendIcon,
  CalendarMonth as CalendarIcon,
  Category as CategoryIcon,
  Flag as PriorityIcon,
} from '@mui/icons-material';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const priorityColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
const categoryColors = ['#6C63FF', '#14B8A6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function StatCard({ icon, label, value, color, index }) {
  const theme = useTheme();
  return (
    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
      <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
        <Card sx={{
          borderRadius: 3,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${color}22, ${color}11)`
            : `linear-gradient(135deg, ${color}18, ${color}08)`,
          border: `1px solid ${color}33`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${color}22` },
        }}>
          <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
            <Box sx={{ mb: 1, color }}>{icon}</Box>
            <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );
}

function MiniBarChart({ data, label }) {
  const theme = useTheme();
  const max = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120 }}>
        {data.map((val, i) => (
          <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{val}</Typography>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(val / max) * 80}px` }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                width: '100%',
                minHeight: 4,
                borderRadius: 4,
                background: `linear-gradient(180deg, #6C63FF, #8b5cf6)`,
              }}
            />
            <Typography variant="caption" color="text.secondary" fontSize={10}>{days[i]}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function DonutChart({ value, size = 120, strokeWidth = 12, color = '#6C63FF' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const theme = useTheme();

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={theme.palette.mode === 'dark' ? '#1e2240' : '#e5e7eb'} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h5" fontWeight={800} color="text.primary">{value}%</Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, actRes] = await Promise.all([
          dashboardAPI.getStats(),
          activityAPI.getAll(),
        ]);
        setStats(statsRes.data);
        setActivities(actRes.data.slice(0, 8));
      } catch (err) {
        console.error(handleAPIError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={i}>
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!stats) return null;

  const statCards = [
    { icon: <TaskIcon fontSize="large" />, label: 'Total Tasks', value: stats.total, color: '#6C63FF' },
    { icon: <CompletedIcon fontSize="large" />, label: 'Completed', value: stats.completed, color: '#22c55e' },
    { icon: <InProgressIcon fontSize="large" />, label: 'In Progress', value: stats.inProgress, color: '#3b82f6' },
    { icon: <PendingIcon fontSize="large" />, label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { icon: <OverdueIcon fontSize="large" />, label: 'Overdue', value: stats.overdue, color: '#ef4444' },
    { icon: <StreakIcon fontSize="large" />, label: 'Day Streak', value: stats.streak, color: '#f97316' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your productivity overview at a glance
        </Typography>
      </motion.div>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Completion Rate */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Completion Rate</Typography>
              <DonutChart value={stats.completionRate} />
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                {stats.completed} of {stats.total} tasks completed
              </Typography>
            </Paper>
          </motion.div>
        </Grid>

        {/* Weekly Productivity */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <MiniBarChart data={stats.weeklyCompletions} label="Weekly Completions" />
            </Paper>
          </motion.div>
        </Grid>

        {/* Priority Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                <PriorityIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Priority Breakdown
              </Typography>
              {Object.entries(stats.priorityBreakdown).map(([priority, count]) => (
                <Box key={priority} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={500}>{priority}</Typography>
                    <Typography variant="body2" color="text.secondary">{count}</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stats.total > 0 ? (count / stats.total) * 100 : 0}
                    sx={{
                      height: 8, borderRadius: 4,
                      bgcolor: theme.palette.mode === 'dark' ? '#1e2240' : '#e5e7eb',
                      '& .MuiLinearProgress-bar': { bgcolor: priorityColors[priority], borderRadius: 4 },
                    }}
                  />
                </Box>
              ))}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Category & Upcoming */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Category Breakdown */}
        <Grid size={{ xs: 12, md: 5 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                <CategoryIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Categories
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(stats.categoryBreakdown).map(([cat, count], i) => (
                  <Chip
                    key={cat}
                    label={`${cat} (${count})`}
                    sx={{
                      fontWeight: 600,
                      bgcolor: `${categoryColors[i % categoryColors.length]}22`,
                      color: categoryColors[i % categoryColors.length],
                      border: `1px solid ${categoryColors[i % categoryColors.length]}44`,
                    }}
                  />
                ))}
              </Box>
              {Object.keys(stats.categoryBreakdown).length === 0 && (
                <Typography variant="body2" color="text.secondary">No tasks yet</Typography>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* Upcoming Deadlines */}
        <Grid size={{ xs: 12, md: 7 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                <CalendarIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Upcoming Deadlines
              </Typography>
              {stats.upcomingDeadlines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No upcoming deadlines 🎉</Typography>
              ) : (
                stats.upcomingDeadlines.map((task) => (
                  <Box key={task.id} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1, borderBottom: '1px solid', borderColor: 'divider',
                  }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{task.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due: {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Chip size="small" label={task.priority}
                      sx={{ bgcolor: priorityColors[task.priority] + '22', color: priorityColors[task.priority], fontWeight: 600 }} />
                  </Box>
                ))
              )}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Time & Activity */}
      <Grid container spacing={2}>
        {/* Time Tracking */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                <TimerIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Time Tracking
              </Typography>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={800} color="primary.main">
                  {Math.floor(stats.totalTimeSpent / 60)}h {stats.totalTimeSpent % 60}m
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Total time spent</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Estimated: {Math.floor(stats.totalTimeEstimated / 60)}h {stats.totalTimeEstimated % 60}m
                </Typography>
                {stats.totalTimeEstimated > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (stats.totalTimeSpent / stats.totalTimeEstimated) * 100)}
                    sx={{
                      mt: 2, height: 8, borderRadius: 4,
                      bgcolor: theme.palette.mode === 'dark' ? '#1e2240' : '#e5e7eb',
                      '& .MuiLinearProgress-bar': { borderRadius: 4 },
                    }}
                  />
                )}
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 8 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                <TrendIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              {activities.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No recent activity</Typography>
              ) : (
                activities.map((act) => (
                  <Box key={act.id} sx={{
                    display: 'flex', gap: 2, py: 1,
                    borderBottom: '1px solid', borderColor: 'divider',
                  }}>
                    <Box sx={{
                      width: 8, minHeight: 8, borderRadius: '50%', mt: 0.8,
                      bgcolor: act.action?.includes('created') ? '#22c55e'
                        : act.action?.includes('deleted') ? '#ef4444'
                        : '#6C63FF',
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{act.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(act.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
}
