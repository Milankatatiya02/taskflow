import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AutoGraph as AnalyticsIcon,
  CalendarMonth as CalendarIcon,
  Folder as ProjectIcon,
  Label as LabelIcon,
  Notifications as NotifIcon,
  Speed as SpeedIcon,
  Task as TaskIcon,
  Timer as TimerIcon,
  ViewKanban as KanbanIcon,
  CloudSync as SyncIcon,
  Group as TeamIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const features = [
  { icon: <KanbanIcon />, title: 'Kanban Board', desc: 'Drag & drop tasks across columns for visual workflow management', color: '#6C63FF' },
  { icon: <CalendarIcon />, title: 'Calendar View', desc: 'See all your deadlines in a beautiful calendar layout', color: '#14B8A6' },
  { icon: <ProjectIcon />, title: 'Projects', desc: 'Organize tasks into projects and collaborate with team members', color: '#f59e0b' },
  { icon: <AnalyticsIcon />, title: 'Analytics Dashboard', desc: 'Track productivity with charts, streaks, and completion rates', color: '#EC4899' },
  { icon: <TimerIcon />, title: 'Time Tracking', desc: 'Built-in timer to track time spent on each task', color: '#3b82f6' },
  { icon: <NotifIcon />, title: 'Smart Notifications', desc: 'Stay informed with in-app notifications and email reminders', color: '#f97316' },
  { icon: <LabelIcon />, title: 'Labels & Tags', desc: 'Color-coded labels to categorize and filter your tasks', color: '#8b5cf6' },
  { icon: <SyncIcon />, title: 'Offline Sync', desc: 'Works offline and syncs when you are back online', color: '#06b6d4' },
  { icon: <TeamIcon />, title: 'Team Collaboration', desc: 'Invite members to projects and assign tasks', color: '#22c55e' },
  { icon: <SpeedIcon />, title: 'Bulk Actions', desc: 'Multi-select and perform actions on multiple tasks at once', color: '#ef4444' },
  { icon: <TaskIcon />, title: 'Task Templates', desc: 'Save and reuse task templates for recurring workflows', color: '#84cc16' },
  { icon: <SecurityIcon />, title: 'Secure & Private', desc: 'JWT authentication with encrypted passwords and rate limiting', color: '#6366f1' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.06, duration: 0.4 },
  }),
};

export default function Landing() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero */}
      <Box sx={{
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        px: 2,
      }}>
        {/* Animated background shapes */}
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
          {[
            { top: '10%', left: '5%', size: 300, color: '#6C63FF', delay: 0 },
            { top: '60%', right: '10%', size: 250, color: '#14B8A6', delay: 1 },
            { bottom: '15%', left: '60%', size: 200, color: '#f59e0b', delay: 2 },
          ].map((s, i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
              transition={{ repeat: Infinity, duration: 6, delay: s.delay }}
              style={{
                position: 'absolute',
                top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                width: s.size, height: s.size,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${s.color}44, transparent)`,
                filter: 'blur(60px)',
              }}
            />
          ))}
        </Box>

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 900,
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              Manage Tasks{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #6C63FF, #14B8A6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Effortlessly
              </Box>
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto', fontWeight: 400 }}>
              The all-in-one productivity platform with projects, kanban boards, analytics, time tracking, and team collaboration — built for modern workflows.
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                size="large"
                sx={{
                  borderRadius: 3,
                  py: 1.5,
                  px: 5,
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #6C63FF, #8b5cf6)',
                  boxShadow: '0 8px 30px #6C63FF33',
                  '&:hover': { boxShadow: '0 12px 40px #6C63FF55', transform: 'translateY(-2px)' },
                  transition: 'all 0.2s',
                }}
              >
                Get Started — Free
              </Button>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="large"
                sx={{ borderRadius: 3, py: 1.5, px: 5, fontWeight: 700, fontSize: '1.1rem' }}
              >
                Sign In
              </Button>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Features Grid */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 1 }}>
            Everything you need
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
            Packed with powerful features to supercharge your productivity
          </Typography>
        </motion.div>

        <Grid container spacing={2.5}>
          {features.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
              <motion.div
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <Card sx={{
                  borderRadius: 3,
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 30px ${f.color}22`,
                  },
                  border: `1px solid ${isDark ? '#ffffff11' : '#00000011'}`,
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: `${f.color}18`, color: f.color, mb: 2,
                    }}>
                      {f.icon}
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
            Ready to boost your productivity?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
            Join TaskFlow today and start managing your work like a pro.
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            size="large"
            sx={{
              borderRadius: 3,
              py: 1.5,
              px: 5,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6C63FF, #14B8A6)',
              boxShadow: '0 8px 30px #6C63FF33',
            }}
          >
            Start For Free
          </Button>
        </motion.div>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 3, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} TaskFlow. Built with ❤️ for productivity.
        </Typography>
      </Box>
    </Box>
  );
}
